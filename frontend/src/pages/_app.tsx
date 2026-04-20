import {
  ColorScheme,
  ColorSchemeProvider,
  Container,
  MantineThemeOverride,
  MantineProvider,
  Stack,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import axios from "axios";
import { getCookie, setCookie } from "cookies-next";
import moment from "moment";
import "moment/min/locales";
import {
  Inter,
  Lato,
  Merriweather,
  Montserrat,
  Nunito,
  Open_Sans,
  Playfair_Display,
  Poppins,
  Roboto,
  Source_Sans_3,
} from "next/font/google";
import { GetServerSidePropsContext } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { IntlProvider } from "react-intl";
import Header from "../components/header/Header";
import { ConfigContext } from "../hooks/config.hook";
import { UserContext } from "../hooks/user.hook";
import { LOCALES } from "../i18n/locales";
import authService from "../services/auth.service";
import configService from "../services/config.service";
import userService from "../services/user.service";
import GlobalStyle from "../styles/global.style";
import globalStyle from "../styles/mantine.style";
import Config from "../types/config.type";
import { CurrentUser } from "../types/user.type";
import i18nUtil from "../utils/i18n.util";
import userPreferences from "../utils/userPreferences.util";
import Footer from "../components/footer/Footer";
import { getDefaultConfig } from "../utils/defaultConfig.util";

const excludeDefaultLayoutRoutes = ["/admin/config/[category]"];
const availableMantineColors = [
  "dark",
  "gray",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
  "victoria",
] as const;
const availableMantineRadii = ["xs", "sm", "md", "lg", "xl"] as const;
const hexColorPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const availableFontPresets = [
  "system",
  "inter",
  "roboto",
  "poppins",
  "openSans",
  "lato",
  "montserrat",
  "nunito",
  "sourceSans3",
  "merriweather",
  "playfairDisplay",
] as const;

const interFont = Inter({ subsets: ["latin"], display: "swap" });
const robotoFont = Roboto({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"] });
const poppinsFont = Poppins({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"] });
const openSansFont = Open_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"] });
const latoFont = Lato({ subsets: ["latin"], display: "swap", weight: ["400", "700"] });
const montserratFont = Montserrat({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"] });
const nunitoFont = Nunito({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"] });
const sourceSans3Font = Source_Sans_3({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"] });
const merriweatherFont = Merriweather({ subsets: ["latin"], display: "swap", weight: ["400", "700"] });
const playfairDisplayFont = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["400", "700"] });

const fontPresetToFamily: Record<(typeof availableFontPresets)[number], string | null> = {
  system: null,
  inter: interFont.style.fontFamily,
  roboto: robotoFont.style.fontFamily,
  poppins: poppinsFont.style.fontFamily,
  openSans: openSansFont.style.fontFamily,
  lato: latoFont.style.fontFamily,
  montserrat: montserratFont.style.fontFamily,
  nunito: nunitoFont.style.fontFamily,
  sourceSans3: sourceSans3Font.style.fontFamily,
  merriweather: merriweatherFont.style.fontFamily,
  playfairDisplay: playfairDisplayFont.style.fontFamily,
};

const normalizeHexColor = (value: string): string | null => {
  if (!hexColorPattern.test(value)) return null;
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value.toLowerCase();
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((channel) =>
      Math.min(255, Math.max(0, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const mixHexColors = (baseHex: string, mixHex: string, weight: number): string => {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  const inverseWeight = 1 - weight;

  return rgbToHex(
    base.r * inverseWeight + mix.r * weight,
    base.g * inverseWeight + mix.g * weight,
    base.b * inverseWeight + mix.b * weight,
  );
};

const createMantineScaleFromHex = (hex: string) => [
  mixHexColors(hex, "#ffffff", 0.92),
  mixHexColors(hex, "#ffffff", 0.82),
  mixHexColors(hex, "#ffffff", 0.68),
  mixHexColors(hex, "#ffffff", 0.54),
  mixHexColors(hex, "#ffffff", 0.36),
  hex,
  mixHexColors(hex, "#000000", 0.1),
  mixHexColors(hex, "#000000", 0.22),
  mixHexColors(hex, "#000000", 0.34),
  mixHexColors(hex, "#000000", 0.46),
] as [string, string, string, string, string, string, string, string, string, string];

function App({ Component, pageProps }: AppProps) {
  const systemTheme = useColorScheme(pageProps.colorScheme);
  const router = useRouter();

  const [colorScheme, setColorScheme] = useState<ColorScheme>(systemTheme);

  const [user, setUser] = useState<CurrentUser | null>(pageProps.user);
  const [route, setRoute] = useState<string>(pageProps.route);

  const [configVariables, setConfigVariables] = useState<Config[]>(
    pageProps.configVariables,
  );
  const getStringConfigValue = (key: string, fallback = ""): string => {
    const config = configVariables?.find((item) => item.key === key);
    return (config?.value ?? config?.defaultValue ?? fallback).trim();
  };

  const customCss = getStringConfigValue("appearance.customCss");
  const themePrimaryColorRaw = getStringConfigValue(
    "appearance.themePrimaryColor",
    "victoria",
  );
  const themePrimaryColorOverrideRaw = getStringConfigValue(
    "appearance.themePrimaryColorOverride",
  );
  const themeRadiusRaw = getStringConfigValue("appearance.themeRadius", "sm");
  const themeFontPresetRaw = getStringConfigValue(
    "appearance.themeFontPreset",
    "system",
  );
  const themeColorSchemeRaw = getStringConfigValue(
    "appearance.themeColorScheme",
    "system",
  );

  const normalizedPrimaryColorOverrideHex = normalizeHexColor(
    themePrimaryColorOverrideRaw,
  );
  const useCustomPrimaryColor = themePrimaryColorRaw === "custom";

  const effectivePrimaryHex = useCustomPrimaryColor
    ? normalizedPrimaryColorOverrideHex
    : null;

  const themePrimaryColor = effectivePrimaryHex
    ? "adminPrimary"
    : (availableMantineColors as readonly string[]).includes(
          themePrimaryColorRaw,
        )
      ? themePrimaryColorRaw
      : "victoria";

  const themeRadius = (availableMantineRadii as readonly string[]).includes(
    themeRadiusRaw,
  )
    ? themeRadiusRaw
    : "sm";

  const themeFontPreset = (availableFontPresets as readonly string[]).includes(
    themeFontPresetRaw,
  )
    ? themeFontPresetRaw
    : "system";

  const selectedFontFamily =
    fontPresetToFamily[themeFontPreset as keyof typeof fontPresetToFamily];
  const adminDefaultColorScheme =
    themeColorSchemeRaw === "light" || themeColorSchemeRaw === "dark"
      ? themeColorSchemeRaw
      : "system";

  const adminTheme: MantineThemeOverride = {
    ...(effectivePrimaryHex
      ? {
          colors: {
            adminPrimary: createMantineScaleFromHex(effectivePrimaryHex),
          },
        }
      : {}),
    primaryColor: themePrimaryColor,
    defaultRadius: themeRadius,
    ...(selectedFontFamily ? { fontFamily: selectedFontFamily } : {}),
  };

  const mergedTheme: MantineThemeOverride = {
    ...globalStyle,
    ...adminTheme,
    colorScheme,
    colors: {
      ...(globalStyle.colors ?? {}),
      ...(adminTheme.colors ?? {}),
    },
  };

  useEffect(() => {
    setRoute(router.pathname);
  }, [router.pathname]);

  useEffect(() => {
    const interval = setInterval(
      async () => await authService.refreshAccessToken(),
      2 * 60 * 1000, // 2 minutes
    );

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pageProps.language) return;
    const cookieLanguage = getCookie("language");
    if (pageProps.language != cookieLanguage) {
      i18nUtil.setLanguageCookie(pageProps.language);
      if (cookieLanguage) location.reload();
    }
  }, []);

  useEffect(() => {
    const userColorPreference = userPreferences.get("colorScheme");
    const colorScheme = user
      ? userColorPreference === "system"
        ? systemTheme
        : userColorPreference
      : adminDefaultColorScheme === "system"
        ? systemTheme
        : adminDefaultColorScheme;

    toggleColorScheme(colorScheme);
  }, [adminDefaultColorScheme, systemTheme, user]);

  const toggleColorScheme = (value: ColorScheme) => {
    setColorScheme(value ?? "light");
    setCookie("mantine-color-scheme", value ?? "light", {
      sameSite: "lax",
    });
  };

  const language = useRef(pageProps.language);
  moment.locale(language.current);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </Head>
      <IntlProvider
        messages={i18nUtil.getLocaleByCode(language.current)?.messages}
        locale={language.current}
        defaultLocale={LOCALES.ENGLISH.code}
      >
        <MantineProvider
          withGlobalStyles
          withNormalizeCSS
          theme={mergedTheme}
        >
          {customCss && (
            <style id="admin-custom-css">
              {customCss.replace(/<\/style/gi, "<\\/style")}
            </style>
          )}
          <ColorSchemeProvider
            colorScheme={colorScheme}
            toggleColorScheme={toggleColorScheme}
          >
            <GlobalStyle />
            <Notifications />
            <ModalsProvider>
              <ConfigContext.Provider
                value={{
                  configVariables,
                  refresh: async () => {
                    setConfigVariables(await configService.list());
                  },
                }}
              >
                <UserContext.Provider
                  value={{
                    user,
                    refreshUser: async () => {
                      const user = await userService.getCurrentUser();
                      setUser(user);
                      return user;
                    },
                  }}
                >
                  {excludeDefaultLayoutRoutes.includes(route) ? (
                    <Component {...pageProps} />
                  ) : (
                    <>
                      <Stack
                        justify="space-between"
                        sx={{ minHeight: "100vh" }}
                      >
                        <div>
                          <Header />
                          <Container>
                            <Component {...pageProps} />
                          </Container>
                        </div>
                        <Footer />
                      </Stack>
                    </>
                  )}
                </UserContext.Provider>
              </ConfigContext.Provider>
            </ModalsProvider>
          </ColorSchemeProvider>
        </MantineProvider>
      </IntlProvider>
    </>
  );
}

// Fetch user and config variables on server side when the first request is made
// These will get passed as a page prop to the App component and stored in the contexts
App.getInitialProps = async ({ ctx }: { ctx: GetServerSidePropsContext }) => {
  let pageProps: {
    user?: CurrentUser;
    configVariables?: Config[];
    route?: string;
    colorScheme: ColorScheme;
    language?: string;
  } = {
    route: ctx.resolvedUrl,
    colorScheme:
      (getCookie("mantine-color-scheme", ctx) as ColorScheme) ?? "light",
  };

  if (ctx.req) {
    const apiURL = process.env.API_URL || "http://localhost:8080";
    const cookieHeader = ctx.req.headers.cookie;

    pageProps.user = await axios(`${apiURL}/api/users/me`, {
      headers: { cookie: cookieHeader },
    })
      .then((res) => res.data)
      .catch(() => null);

    try {
      pageProps.configVariables = (
        await axios(`${apiURL}/api/configs`, {
          timeout: 1000,
        })
      ).data;
    } catch (e) {
      pageProps.configVariables = getDefaultConfig();
    }

    pageProps.route = ctx.req.url;

    const requestLanguage = i18nUtil.getLanguageFromAcceptHeader(
      ctx.req.headers["accept-language"],
    );

    pageProps.language = ctx.req.cookies["language"] ?? requestLanguage;
  }
  return { pageProps };
};

export default App;
