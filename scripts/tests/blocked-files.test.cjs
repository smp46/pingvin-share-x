const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../frontend/node_modules/typescript");

// Exercise the actual TypeScript utility without introducing a test dependency.
const sourcePath = path.join(
  __dirname,
  "../../frontend/src/utils/blockedFiles.util.ts",
);
const output = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2017,
  },
}).outputText;
const exportsObject = {};
vm.runInNewContext(output, { exports: exportsObject, Set });
const { hasBlockedFileExtension, filterBlockedFiles } = exportsObject;
const blocked =
  "exe bat cmd sh ps1 js html htm svg xhtml msi scr jar apk dll".split(" ");
let checks = 0;
for (const extension of blocked) {
  for (const name of [
    `file.${extension}`,
    `file.${extension.toUpperCase()}`,
    `report.pdf.${extension}`,
    `report.${extension}.pdf`,
    `file.${extension}. `,
    `file.${extension} `,
    `file.${extension.toUpperCase()} .txt`,
    `.${extension}`,
  ]) {
    assert.equal(hasBlockedFileExtension(name), true, `must reject ${name}`);
    checks++;
  }
}
for (const name of [
  "notes.txt",
  "report.pdf",
  "image.png",
  "archive.zip",
  "script.javascript",
  "myexe",
  "README",
  "file.",
  "space . txt",
  "file.executable",
  "folder.js/notes.txt",
  "folder.exe\\notes.txt",
]) {
  assert.equal(hasBlockedFileExtension(name), false, `must permit ${name}`);
  checks++;
}
assert.equal(hasBlockedFileExtension("folder/report.pdf.EXE. "), true);
assert.equal(hasBlockedFileExtension("folder\\evil.HTML"), true);
checks += 2;
const safe = { name: "notes.txt", size: 10 };
const unsafe = { name: "evil.HTML", size: 20 };
const rejected = [];
const result = filterBlockedFiles(
  [unsafe, safe, { name: "report.pdf.exe" }],
  (name) => rejected.push(name),
);
assert.equal(result.length, 1);
assert.equal(
  result[0],
  safe,
  "preserve original File object, metadata and order",
);
assert.deepEqual(rejected, ["evil.HTML", "report.pdf.exe"]);
assert.equal(filterBlockedFiles([unsafe], () => {}).length, 0);
assert.equal(filterBlockedFiles([], () => {}).length, 0);
checks += 5;
console.log(
  `PASS: ${checks} blocked-file assertions (all 15 extensions, case, multiple extensions, trailing dots/spaces, paths, mixed/all-blocked/empty batches).`,
);
