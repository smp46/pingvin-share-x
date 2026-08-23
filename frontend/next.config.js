/** @type {import('next').NextConfig} */
const { version } = require("./package.json");

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkOnly",
    },
  ],
});

module.exports = withPWA({
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
  output: "standalone",
  images: {
    unoptimized: true,
  },
  env: {
    VERSION: version,
    // The version alone cannot tell two builds of the same beta apart, which
    // matters when working out what is actually running on a server. Supplied
    // as a build argument because .git is not in the docker build context.
    // Empty for a build that was not told, and the admin page then omits it.
    // Cut to the seven characters that get displayed, because next inlines
    // this value literally and there is no reason to ship the other thirty
    // three to every browser.
    BUILD_COMMIT: (process.env.BUILD_COMMIT ?? "").trim().slice(0, 7),
  },
});
