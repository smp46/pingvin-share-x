import axios from "axios";
import { GetServerSidePropsContext } from "next";
import Config from "../types/config.type";
import { getDefaultConfig } from "../utils/defaultConfig.util";
import { getPwaScheme, PWA_BACKGROUNDS } from "../utils/pwaColors.util";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
// Sizes of the icons with background and padding (see LogoService in the backend)
const MASKABLE_ICON_SIZES = [192, 512];

const getManifestConfig = async (): Promise<{
  appName: string;
  colorScheme: string;
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
  };
};

// The manifest is generated dynamically so that the app name configured by
// the admin (general.appName) is used when the web app gets installed.
export const getServerSideProps = async ({
  res,
}: GetServerSidePropsContext) => {
  const { appName, colorScheme } = await getManifestConfig();
  const scheme = getPwaScheme(colorScheme);
  const backgroundColor = PWA_BACKGROUNDS[scheme];

  const manifest = {
    id: "/",
    name: appName,
    short_name: appName,
    theme_color: backgroundColor,
    background_color: backgroundColor,
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    // Transparent icons must not be marked as maskable, otherwise every
    // browser fills the transparency with a different color.
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

// The response is written in getServerSideProps, nothing gets rendered.
export default function Manifest() {
  return null;
}
