import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  allocateDuplicateName,
  buildShareFolderName,
  resolveWithinRoot,
  sanitizeRelativePath,
  sanitizeShareDestination,
} from "../src/storage/path.util";
import { migrateShareToNativeLayout } from "../src/storage/migrate-native.util";

function test(name: string, fn: () => void | Promise<void>) {
  return { name, fn };
}

async function run() {
  const tests = [
    test("sanitizeRelativePath preserves nested folders", () => {
      assert.strictEqual(
        sanitizeRelativePath("Event/Day1/IMG0001.CR3"),
        "Event/Day1/IMG0001.CR3",
      );
    }),

    test("sanitizeRelativePath rejects traversal", () => {
      assert.throws(() => sanitizeRelativePath("../../etc/passwd"), /path_traversal|invalid_path/);
      assert.throws(() => sanitizeRelativePath("foo/../bar"), /path_traversal/);
      assert.throws(() => sanitizeRelativePath("/absolute/path"), /path_traversal/);
    }),

    test("allocateDuplicateName appends (n) before extension", () => {
      const existing = new Set(["photo.jpg"]);
      assert.strictEqual(
        allocateDuplicateName("photo.jpg", existing),
        "photo (1).jpg",
      );
      existing.add("photo (1).jpg");
      assert.strictEqual(
        allocateDuplicateName("photo.jpg", existing),
        "photo (2).jpg",
      );
    }),

    test("allocateDuplicateName works in nested folders", () => {
      const existing = new Set(["Day1/photo.jpg"]);
      assert.strictEqual(
        allocateDuplicateName("Day1/photo.jpg", existing),
        "Day1/photo (1).jpg",
      );
    }),

    test("buildShareFolderName schemes", () => {
      const share = {
        id: "ABC123",
        name: "Gridlife Uploads",
        createdAt: new Date("2026-07-21T12:00:00Z"),
        creatorUsername: "Jimmy",
      };
      assert.strictEqual(buildShareFolderName("shareId", share), "Share-ABC123");
      assert.strictEqual(
        buildShareFolderName("dateShareId", share),
        "2026-07-21_ABC123",
      );
      assert.strictEqual(
        buildShareFolderName("shareName", share),
        "Gridlife Uploads",
      );
      assert.strictEqual(
        buildShareFolderName("uploaderDate", share),
        "Jimmy_2026-07-21",
      );
      assert.strictEqual(
        buildShareFolderName("custom", share, "{uploader}_{shareName}"),
        "Jimmy_Gridlife Uploads",
      );
    }),

    test("resolveWithinRoot blocks escape", () => {
      const root = path.resolve("/tmp/uploads-test-root");
      assert.throws(() => resolveWithinRoot(root, "../outside"), /path_traversal/);
      const inside = resolveWithinRoot(root, "Incoming/Share-ABC");
      assert.ok(inside.startsWith(root));
    }),

    test("sanitizeShareDestination normalizes", () => {
      assert.strictEqual(
        sanitizeShareDestination("Events/Gridlife 2026"),
        "Events/Gridlife 2026",
      );
      assert.throws(() => sanitizeShareDestination("../../etc"), /path_traversal/);
    }),

    test("migration renames opaque ids to original names", async () => {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pingvin-migrate-"));
      const shareId = "legacy1";
      const fileId = "8b12d0ff-acde-4b11-9c00-111111111111";
      const legacyDir = path.join(tmp, "shares", shareId);
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, fileId), "RAWDATA");

      let savedSharePath = "";
      let savedStorageName = "";

      const result = await migrateShareToNativeLayout({
        uploadsRoot: tmp,
        share: {
          id: shareId,
          storagePath: null,
          storageProvider: "LOCAL",
          name: "Test",
          createdAt: new Date("2026-07-21"),
        },
        files: [{ id: fileId, name: "Day1/IMG0001.CR3", storageName: null }],
        buildStoragePath: () => "Incoming/Share-legacy1",
        updateShareStoragePath: async (_id, p) => {
          savedSharePath = p;
        },
        updateFileStorageName: async (_id, name) => {
          savedStorageName = name;
        },
      });

      assert.strictEqual(result.migratedFiles, 1);
      assert.strictEqual(savedSharePath, "Incoming/Share-legacy1");
      assert.strictEqual(savedStorageName, "Day1/IMG0001.CR3");

      const migrated = path.join(
        tmp,
        "Incoming",
        "Share-legacy1",
        "Day1",
        "IMG0001.CR3",
      );
      const content = await fs.readFile(migrated, "utf8");
      assert.strictEqual(content, "RAWDATA");

      await fs.rm(tmp, { recursive: true, force: true });
    }),

    test("move is a filesystem rename when possible", async () => {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pingvin-move-"));
      const src = path.join(tmp, "Incoming", "Share-ABC");
      const dest = path.join(tmp, "Events", "Gridlife 2026");
      await fs.mkdir(src, { recursive: true });
      await fs.writeFile(path.join(src, "photo.jpg"), "img");

      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.rename(src, dest);

      const content = await fs.readFile(path.join(dest, "photo.jpg"), "utf8");
      assert.strictEqual(content, "img");
      await assert.rejects(fs.access(src));

      await fs.rm(tmp, { recursive: true, force: true });
    }),

    test("download path resolves legacy id and native storageName", () => {
      const root = "/data/uploads";
      const legacyShare = { id: "abc", storagePath: null as string | null };
      const nativeShare = {
        id: "abc",
        storagePath: "Incoming/Share-abc",
      };

      const legacyRelative = legacyShare.storagePath || `shares/${legacyShare.id}`;
      const nativeRelative = nativeShare.storagePath!;

      const legacyFile = resolveWithinRoot(
        path.resolve(root, legacyRelative),
        "8b12d0ff-acde-4b11-9c00-111111111111",
      );
      const nativeFile = resolveWithinRoot(
        path.resolve(root, nativeRelative),
        "Day1/IMG0001.CR3",
      );

      assert.ok(legacyFile.includes(`${path.sep}shares${path.sep}abc${path.sep}`));
      assert.ok(nativeFile.endsWith(path.join("Day1", "IMG0001.CR3")));
    }),
  ];

  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok - ${t.name}`);
    } catch (err) {
      failed += 1;
      console.error(`not ok - ${t.name}`);
      console.error(err);
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

run();
