import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ClamScanService } from "./clamscan.service";

// check() reads the share directory and reports anything infected by a name a
// person recognises. The names used to come from one database query per file;
// they now come from one query for the whole share, so what has to stay true
// is which name each file ends up with, including a file on disk that has no
// row at all.

let root: string;

jest.mock("../constants", () => ({
  get SHARE_DIRECTORY() {
    return root;
  },
}));

const SHARE = "scan-spec";

const scanned: string[] = [];

const build = (rows: { id: string; name: string }[]) => {
  const prisma = {
    share: { findUnique: async () => ({ storageProvider: "LOCAL" }) },
    file: { findMany: async () => rows },
  };

  const service = new ClamScanService({} as any, prisma as any);

  // stand in for clamav: record what was handed over, find nothing
  (service as any).getClamScan = async () => ({});
  (service as any).scanFile = async (_clam: unknown, open: () => unknown) => {
    open();
    return { isInfected: false, failed: false };
  };
  (service as any).logger = {
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  return service;
};

const infectedNames = async (
  rows: { id: string; name: string }[],
  onDisk: string[],
) => {
  for (const id of onDisk) fs.writeFileSync(path.join(root, SHARE, id), "x");

  const service = build(rows);
  (service as any).scanFile = async () => ({ isInfected: true, failed: false });

  const { infectedFiles } = await service.check(SHARE);
  return infectedFiles.map((f) => `${f.id}:${f.name}`).sort();
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "clamscan-spec-"));
  fs.mkdirSync(path.join(root, SHARE));
  scanned.length = 0;
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("check, local storage", () => {
  it("reports an infected file by the name it was uploaded under", async () => {
    expect(
      await infectedNames([{ id: "id-a", name: "raport.pdf" }], ["id-a"]),
    ).toEqual(["id-a:raport.pdf"]);
  });

  it("names every file in the share, not just the first", async () => {
    expect(
      await infectedNames(
        [
          { id: "id-a", name: "a.txt" },
          { id: "id-b", name: "b.txt" },
        ],
        ["id-a", "id-b"],
      ),
    ).toEqual(["id-a:a.txt", "id-b:b.txt"]);
  });

  // a file on disk with no row still gets scanned, reported by its id
  it("falls back to the id when there is no row for a file", async () => {
    expect(await infectedNames([], ["orphan-id"])).toEqual([
      "orphan-id:orphan-id",
    ]);
  });

  it("never scans the generated archive", async () => {
    const service = build([{ id: "id-a", name: "a.txt" }]);
    const opened: string[] = [];
    (service as any).scanFile = async (_c: unknown, open: () => unknown) => {
      opened.push(String(open));
      return { isInfected: true, failed: false };
    };
    for (const f of ["id-a", "archive.zip"])
      fs.writeFileSync(path.join(root, SHARE, f), "x");

    const { infectedFiles } = await service.check(SHARE);

    expect(infectedFiles.map((f) => f.id)).toEqual(["id-a"]);
  });

  it("says nothing is wrong when the share has nothing on disk", async () => {
    fs.rmSync(path.join(root, SHARE), { recursive: true });

    const result = await build([]).check(SHARE);

    expect(result).toEqual({ infectedFiles: [], scanFailed: false });
  });
});
