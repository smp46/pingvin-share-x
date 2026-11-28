import { getCookie, setCookie } from "cookies-next/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ShareViewMode } from "../components/share/ViewModeToggle";
import { getQueryString } from "../utils/router.util";

const COOKIE_NAME = "share.view-mode";

const isViewMode = (value: unknown): value is ShareViewMode =>
  value === "list" || value === "gallery";

const resolveViewMode = (
  enabled: boolean,
  fromUrl: string | undefined,
  fromCookie: unknown,
): ShareViewMode => {
  if (!enabled) return "list";
  if (isViewMode(fromUrl)) return fromUrl;
  if (isViewMode(fromCookie)) return fromCookie;
  return "list";
};

const useShareViewMode = (enabled: boolean): [ShareViewMode, () => void] => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ShareViewMode>("list");

  // "list" is the default, so it is represented by the absence of the param.
  const syncState = (mode: ShareViewMode) => {
    const { view: _view, ...rest } = router.query;
    router.replace(
      {
        pathname: router.pathname,
        query: mode === "gallery" ? { ...rest, view: mode } : rest,
      },
      undefined,
      { shallow: true },
    );

    setCookie(COOKIE_NAME, mode, {
      sameSite: "lax",
      expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    });
  };

  useEffect(() => {
    if (!router.isReady) return;
    const fromUrl = getQueryString(router.query.view);
    const fromCookie = getCookie(COOKIE_NAME);
    const resolved = resolveViewMode(enabled, fromUrl, fromCookie);
    setViewMode(resolved);
    syncState(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.view, enabled]);

  const toggle = () => {
    const next: ShareViewMode = viewMode === "list" ? "gallery" : "list";
    syncState(next);
  };

  return [viewMode, toggle];
};

export default useShareViewMode;
