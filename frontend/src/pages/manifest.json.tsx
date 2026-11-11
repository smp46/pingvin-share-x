import axios from "axios";
import { GetServerSidePropsContext } from "next";
import Config from "../types/config.type";
import { getDefaultConfig } from "../utils/defaultConfig.util";
import {
  getPwaScheme,
  getPwaThemeColor,
  PWA_BACKGROUNDS,
} from "../utils/pwaColors.util";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_ICON_SIZES = [192, 512];

const getManifestConfig = async (): Promise<{
  appName: string;
  colorScheme: string;
  primaryColor: string;
  primaryColorOverride: string;
}> => {
  const apiURL = process.env.API_URL || "http://localhost:8080";

  let configVariables: Config[];
  try {
    configVariables = (
      await axios(`${apiURL}/api/configs`, {
        timeout: 1000,
      })
    ).data;
  } catch {
    configVariables = getDefaultConfig();
  }

  const getValue = (key: string) => {
    const variable = configVariables?.find((item) => item.key === key);
    return (variable?.value ?? variable?.defaultValue ?? "").trim();
  };

  return {
    appName: getValue("general.appName") || "Pingvin Share X",
    colorScheme: getValue("appearance.themeColorScheme"),
    primaryColor: getValue("appearance.themePrimaryColor"),
    primaryColorOverride: getValue("appearance.themePrimaryColorOverride"),
  };
};

export const getServerSideProps = async ({
  res,
}: GetServerSidePropsContext) => {
  const { appName, colorScheme, primaryColor, primaryColorOverride } =
    await getManifestConfig();
  const scheme = getPwaScheme(colorScheme);
  const backgroundColor = PWA_BACKGROUNDS[scheme];
  const themeColor = getPwaThemeColor(
    primaryColor,
    primaryColorOverride,
    scheme,
  );

  const manifest = {
    id: "/",
    name: appName,
    short_name: appName,
    theme_color: themeColor,
    background_color: backgroundColor,
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: [
      ...ICON_SIZES.map((size) => ({
        src: `/img/icons/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
      ...MASKABLE_ICON_SIZES.map((size) => ({
        src: `/img/icons/icon-maskable-${scheme}-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "maskable",
      })),
    ],
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "files",
            accept: ["*/*"],
          },
        ],
      },
    },
  };

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
  res.write(JSON.stringify(manifest));
  res.end();

  return { props: {} };
};

export default function Manifest() {
  return null;
}
