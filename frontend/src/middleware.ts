import { jwtDecode } from "jwt-decode";
import { NextRequest, NextResponse } from "next/server";
import configService from "./services/config.service";

// This middleware redirects based on different conditions:
// - Authentication state
// - Setup status
// - Admin privileges

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
};

// In-memory cache for config to avoid fetching on every request
let configCache: { data: any; timestamp: number } | null = null;
const CONFIG_CACHE_TTL = 30 * 1000; // 30 seconds cache TTL

// Fetch config with caching and error handling
async function fetchConfig(apiUrl: string): Promise<any> {
  const now = Date.now();

  // Return cached config if still valid
  if (configCache && now - configCache.timestamp < CONFIG_CACHE_TTL) {
    return configCache.data;
  }

  try {
    const response = await fetch(`${apiUrl}/api/configs`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    configCache = { data, timestamp: now };

    return data;
  } catch (error) {
    // If fetch fails but we have stale cache, use it as fallback
    if (configCache) {
      console.error("Config fetch failed, using stale cache:", error);
      return configCache.data;
    }

    // If no cache available, return safe defaults
    console.error("Config fetch failed with no cache, using defaults:", error);
    return getDefaultConfig();
  }
}

// Safe default configuration when API is unavailable
function getDefaultConfig() {
  return [
    { key: "general.showHomePage", value: "true", defaultValue: "true", type: "boolean" },
    { key: "share.allowRegistration", value: "true", defaultValue: "true", type: "boolean" },
    { key: "share.allowUnauthenticatedShares", value: "false", defaultValue: "false", type: "boolean" },
    { key: "smtp.enabled", value: "false", defaultValue: "false", type: "boolean" },
    { key: "legal.enabled", value: "false", defaultValue: "false", type: "boolean" },
    { key: "legal.imprintText", value: "", defaultValue: "", type: "text" },
    { key: "legal.imprintUrl", value: "", defaultValue: "", type: "string" },
    { key: "legal.privacyPolicyText", value: "", defaultValue: "", type: "text" },
    { key: "legal.privacyPolicyUrl", value: "", defaultValue: "", type: "string" },
  ];
}

export async function middleware(request: NextRequest) {
  const routes = {
    unauthenticated: new Routes(["/auth/*", "/"]),
    public: new Routes([
      "/share/*",
      "/s/*",
      "/upload/*",
      "/error",
      "/imprint",
      "/privacy",
    ]),
    admin: new Routes(["/admin/*"]),
    account: new Routes(["/account*"]),
    disabled: new Routes([]),
  };

  // Get config from backend with caching and error handling
  const apiUrl = process.env.API_URL || "http://localhost:8080";
  const config = await fetchConfig(apiUrl);

  const getConfig = (key: string) => {
    return configService.get(key, config);
  };

  const route = request.nextUrl.pathname;
  let user: { isAdmin: boolean } | null = null;
  const accessToken = request.cookies.get("access_token")?.value;

  try {
    const claims = jwtDecode<{ exp: number; isAdmin: boolean }>(
      accessToken as string,
    );
    if (claims.exp * 1000 > Date.now()) {
      user = claims;
    }
  } catch {
    user = null;
  }

  if (!getConfig("share.allowRegistration")) {
    routes.disabled.routes.push("/auth/signUp");
  }

  if (getConfig("share.allowUnauthenticatedShares")) {
    routes.public.routes = ["*"];
  }

  if (!getConfig("smtp.enabled")) {
    routes.disabled.routes.push("/auth/resetPassword*");
  }

  if (!getConfig("legal.enabled")) {
    routes.disabled.routes.push("/imprint", "/privacy");
  } else {
    if (!getConfig("legal.imprintText") && !getConfig("legal.imprintUrl")) {
      routes.disabled.routes.push("/imprint");
    }
    if (
      !getConfig("legal.privacyPolicyText") &&
      !getConfig("legal.privacyPolicyUrl")
    ) {
      routes.disabled.routes.push("/privacy");
    }
  }

  // prettier-ignore
  const rules = [
    // Disabled routes
    {
      condition: routes.disabled.contains(route),
      path: "/",
    },
     // Authenticated state
     {
      condition: user && routes.unauthenticated.contains(route) && !getConfig("share.allowUnauthenticatedShares"),
      path: "/upload",
    },
    // Unauthenticated state
    {
      condition: !user && !routes.public.contains(route) && !routes.unauthenticated.contains(route),
      path: "/auth/signIn",
    },
    {
      condition: !user && routes.account.contains(route),
      path: "/upload",
    },
    // Admin privileges
    {
      condition: routes.admin.contains(route) && !user?.isAdmin,
      path: "/upload",
    },
    // Home page
    {
      condition: (!getConfig("general.showHomePage") || user) && route == "/",
      path: "/upload",
    },
    // Imprint redirect
    {
      condition: route == "/imprint" && !getConfig("legal.imprintText") && getConfig("legal.imprintUrl"),
      path: getConfig("legal.imprintUrl"),
    },
    // Privacy redirect
    {
      condition: route == "/privacy" && !getConfig("legal.privacyPolicyText") && getConfig("legal.privacyPolicyUrl"),
      path: getConfig("legal.privacyPolicyUrl"),
    },
  ];
  for (const rule of rules) {
    if (rule.condition) {
      let { path } = rule;

      if (path == "/auth/signIn") {
        path = path + "?redirect=" + encodeURIComponent(route);
      }
      return NextResponse.redirect(new URL(path, request.url));
    }
  }
}

// Helper class to check if a route matches a list of routes
class Routes {
  // eslint-disable-next-line no-unused-vars
  constructor(public routes: string[]) {}

  contains(_route: string) {
    for (const route of this.routes) {
      if (new RegExp("^" + route.replace(/\*/g, ".*") + "$").test(_route))
        return true;
    }
    return false;
  }
}
