import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ShareService } from "./share.service";

// a getter rather than a fixed value, so each test can point the share
// directory at its own temporary root without reloading the module
jest.mock("../constants", () => ({
  get SHARE_DIRECTORY() {
    return root;
  },
}));

// A share of more than one file is downloaded as a zip that this builds, and
// nothing checked that the zip was a zip. That mattered when the archiver
// major changed how it is constructed, so this makes the output the thing
// under test rather than the call: real files on disk, a real archive, read
// back with unzip.

const SHARE_ID = "zip-spec-share";

let root = "";

const shareDir = () => path.join(root, SHARE_ID);

const writeFile = (id: string, contents: string) =>
  fs.writeFileSync(path.join(shareDir(), id), contents);

// createZip only reaches prisma and config, which are the first and the
// fifth of eleven constructor arguments
const construct = (prisma: unknown, config: unknown) => {
  const unused = {} as any;
  return new ShareService(
    prisma as any,
    unused,
    unused,
    unused,
    config as any,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
  );
};

const build = (files: { id: string; name: string }[]) =>
  construct(
    { file: { findMany: async () => files } },
    { get: (key: string) => (key === "s3.enabled" ? false : 5) },
  );

const entriesOf = (zip: string) =>
  execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .sort();

const contentsOf = (zip: string, name: string) =>
  execFileSync("unzip", ["-p", zip, name], { encoding: "utf8" });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "pingvin-zip-"));
  fs.mkdirSync(shareDir());
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("createZip", () => {
  it("writes an archive holding every file under its own name", async () => {
    writeFile("id-one", "first file");
    writeFile("id-two", "second file");

    await build([
      { id: "id-one", name: "notes.txt" },
      { id: "id-two", name: "report.txt" },
    ]).createZip(SHARE_ID);

    const zip = path.join(shareDir(), "archive.zip");
    expect(fs.existsSync(zip)).toBe(true);
    expect(entriesOf(zip)).toEqual(["notes.txt", "report.txt"]);
  });

  it("keeps the bytes intact", async () => {
    writeFile("id-one", "the exact contents");

    await build([{ id: "id-one", name: "notes.txt" }]).createZip(SHARE_ID);

    expect(contentsOf(path.join(shareDir(), "archive.zip"), "notes.txt")).toBe(
      "the exact contents",
    );
  });

  it("keeps the folder structure a name carries", async () => {
    writeFile("id-one", "inside a folder");

    await build([{ id: "id-one", name: "docs/readme.md" }]).createZip(SHARE_ID);

    expect(entriesOf(path.join(shareDir(), "archive.zip"))).toEqual([
      "docs/readme.md",
    ]);
  });

  it("produces an archive unzip considers valid", async () => {
    writeFile("id-one", "a");
    writeFile("id-two", "b");

    await build([
      { id: "id-one", name: "a.txt" },
      { id: "id-two", name: "b.txt" },
    ]).createZip(SHARE_ID);

    expect(() =>
      execFileSync("unzip", ["-t", path.join(shareDir(), "archive.zip")], {
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("does nothing when s3 is serving the files", async () => {
    const service = construct({ file: { findMany: async () => [] } }, {
      get: () => true,
    });

    await service.createZip(SHARE_ID);

    expect(fs.existsSync(path.join(shareDir(), "archive.zip"))).toBe(false);
  });
});
