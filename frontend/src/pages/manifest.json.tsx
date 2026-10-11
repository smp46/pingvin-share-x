import axios from "axios";
import { GetServerSidePropsContext } from "next";
import Config from "../types/config.type";
import { getDefaultConfig } from "../utils/defaultConfig.util";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const getAppName = async (): Promise<string> => {
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

  const appName = configVariables
    ?.find((item) => item.key === "general.appName")
    ?.value?.trim();

  return appName || "Pingvin Share X";
};

// The manifest is generated dynamically so that the app name configured by
// the admin (general.appName) is used when the web app gets installed.
export const getServerSideProps = async ({
  res,
}: GetServerSidePropsContext) => {
  const appName = await getAppName();

  const manifest = {
    id: "/",
    name: appName,
    short_name: appName.length > 12 ? appName.substring(0, 12) : appName,
    theme_color: "#46509e",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: ICON_SIZES.map((size) => ({
      src: `/img/icons/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any maskable",
    })),
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
