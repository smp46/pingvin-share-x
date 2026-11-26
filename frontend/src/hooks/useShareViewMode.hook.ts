import { getCookie, setCookie } from "cookies-next/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ShareViewMode } from "../components/share/ViewModeToggle";
import { getQueryString } from "../utils/router.util";

const COOKIE_NAME = "share.view-mode";

const isViewMode = (value: unknown): value is ShareViewMode =>
  value === "list" || value === "gallery";

const useShareViewMode = (enabled: boolean): [ShareViewMode, () => void] => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ShareViewMode>("list");

  useEffect(() => {
    if (!router.isReady) return;
    const fromUrl = getQueryString(router.query.view);
    const fromCookie = getCookie(COOKIE_NAME);
    if (!enabled) setViewMode("list");
    else if (isViewMode(fromUrl)) setViewMode(fromUrl);
    else if (isViewMode(fromCookie)) setViewMode(fromCookie);
    else setViewMode("list");
  }, [router.isReady, router.query.view, enabled]);

  const toggle = () => {
    const next: ShareViewMode = viewMode === "list" ? "gallery" : "list";
    setCookie(COOKIE_NAME, next, {
      sameSite: "lax",
      expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    });
    router.replace(
      { pathname: router.pathname, query: { ...router.query, view: next } },
      undefined,
      { shallow: true },
    );
  };

  return [viewMode, toggle];
};

export default useShareViewMode;
