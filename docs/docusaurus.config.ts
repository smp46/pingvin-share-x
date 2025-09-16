import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "Pingvin Share X",
  tagline:
    "Pingvin Share X is a self-hosted file sharing platform and an alternative for WeTransfer.",
  favicon: "img/pingvinshare.svg",

  url: "https://smp46.github.io",
  baseUrl: "/pingvin-share-x/",
  organizationName: "smp46",
  projectName: "pingvin-share-x",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/smp46/pingvin-share-x/edit/main/docs",
        },
        blog: false,
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/pingvinshare.svg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Pingvin Share X",
      logo: {
        alt: "Pingvin Share Logo",
        src: "img/pingvinshare.svg",
      },
      items: [
        {
          href: "https://github.com/smp46/pingvin-share-x",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
