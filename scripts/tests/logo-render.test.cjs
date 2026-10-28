const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { test } = require("node:test");
const localRequire = createRequire(
  path.resolve(__dirname, "../../frontend/package.json"),
);
const ts = localRequire("typescript");
const React = localRequire("react");
const { renderToStaticMarkup } = localRequire("react-dom/server");

// Render the production component, substituting only the selected Mantine scheme.
function renderLogo(colorScheme, height, width) {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../frontend/src/components/Logo.tsx"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      return name === "@mantine/core"
        ? { useMantineColorScheme: () => ({ colorScheme }) }
        : localRequire(name);
    },
  });
  return renderToStaticMarkup(
    React.createElement(exports.default, { height, width }),
  );
}
function styleOf(tag) {
  return Object.fromEntries(
    (tag.match(/style="([^"]*)"/)?.[1] || "")
      .split(";")
      .filter(Boolean)
      .map((rule) => rule.split(":")),
  );
}

for (const scheme of ["light", "dark"]) {
  for (const [height, width] of [
    [35, 35],
    [80, 80],
    [80, 120],
  ]) {
    test(`${scheme} ${width}×${height}: preserve crest and custom upload corner pixels`, () => {
      const markup = renderLogo(scheme, height, width);
      const img = markup.match(/<img\b[^>]*>/)?.[0];
      assert.ok(img, "Production Logo renders an image");
      const imageStyle = styleOf(img);
      // A round <img> clips replaced-image corners, including this crest's ® mark
      // and the corners of any square custom PNG written to the same source URL.
      assert.ok(
        !imageStyle["border-radius"] || imageStyle["border-radius"] === "0",
        "Image corners must remain square and visible",
      );
      assert.equal(imageStyle["object-fit"], "contain");
      assert.match(img, new RegExp(`height="${height}"`));
      assert.match(img, new RegExp(`width="${width}"`));
      assert.match(
        img,
        new RegExp(
          `src="/img/${scheme === "dark" ? "logo-dark" : "logo"}\\.png"`,
        ),
      );
      const outer = markup.match(/^<span\b[^>]*>/)?.[0];
      assert.ok(outer, "White backing belongs to a separate wrapper");
      const backingStyle = styleOf(outer);
      assert.equal(backingStyle["background-color"], "#fff");
      assert.equal(backingStyle["border-radius"], "50%");
      assert.equal(
        backingStyle.overflow,
        "visible",
        "Backing must not clip custom image or registration mark",
      );
      assert.equal(backingStyle.width, `${width}px`);
      assert.equal(backingStyle.height, `${height}px`);
      assert.equal(backingStyle["flex-shrink"], "0");
      assert.ok(!imageStyle["clip-path"] && !backingStyle["clip-path"]);
    });
  }
}

// Optional review artifact uses actual React-rendered production markup/styles.
if (process.env.LOGO_PREVIEW_PATH) {
  const imgDir = path.resolve(__dirname, "../../frontend/public/img");
  const crest = fs
    .readFileSync(path.join(imgDir, "logo.png"))
    .toString("base64");
  const custom = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#22c55e"/><path d="M0 0h18v18H0zM102 62h18v18h-18z" fill="#f43f5e"/><path d="M102 0h18v18h-18zM0 62h18v18H0z" fill="#2563eb"/></svg>',
  ).toString("base64");
  const sections = ["light", "dark"]
    .map(
      (scheme) =>
        `<section class="${scheme}"><h2>${scheme} background</h2>${[
          [35, 35],
          [80, 80],
          [80, 120],
        ]
          .map(
            ([height, width]) =>
              `<figure>${renderLogo(scheme, height, width).replace(/src="[^"]*"/, `src="data:image/png;base64,${crest}"`)}<figcaption>Crest ${width}×${height}</figcaption></figure>`,
          )
          .join("")}${[
          [80, 80],
          [80, 120],
        ]
          .map(
            ([height, width]) =>
              `<figure>${renderLogo(scheme, height, width).replace(/src="[^"]*"/, `src="data:image/svg+xml;base64,${custom}"`)}<figcaption>Custom corner fixture ${width}×${height}</figcaption></figure>`,
          )
          .join("")}</section>`,
    )
    .join("");
  fs.writeFileSync(
    process.env.LOGO_PREVIEW_PATH,
    `<!doctype html><html><head><meta charset="utf-8"><title>Logo component preview</title><style>body{font:16px system-ui;margin:0}main{display:flex}section{width:50%;padding:24px;box-sizing:border-box}.light{background:#fff;color:#141820}.dark{background:#141820;color:#fff}figure{margin:24px 0}figcaption{margin-top:8px}</style></head><body><p>Actual React server-rendered Logo markup and styles. Image sources embedded for offline review. Custom fixture has colored corners. Browser visual verification was unavailable in the implementation environment.</p><main>${sections}</main></body></html>`,
  );
}
