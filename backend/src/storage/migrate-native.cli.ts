/**
 * CLI: migrate legacy UUID-named local shares to native filename layout.
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register src/storage/migrate-native.cli.ts
 *   npx ts-node -r tsconfig-paths/register src/storage/migrate-native.cli.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import * as path from "path";
import { UPLOADS_DIRECTORY } from "../constants";
import { buildShareFolderName } from "./path.util";
import { migrateShareToNativeLayout } from "./migrate-native.util";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();
  const uploadsRoot = path.resolve(UPLOADS_DIRECTORY);

  console.log(
    `Migrating local shares under ${uploadsRoot}${dryRun ? " (dry-run)" : ""}`,
  );

  const shares = await prisma.share.findMany({
    where: { storageProvider: "LOCAL" },
    include: {
      files: true,
      creator: { select: { username: true } },
    },
  });

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const share of shares) {
    const needsMigration =
      !share.storagePath || share.files.some((f) => !f.storageName);
    if (!needsMigration) continue;

    const result = await migrateShareToNativeLayout({
      uploadsRoot,
      share: {
        id: share.id,
        storagePath: share.storagePath,
        storageProvider: share.storageProvider,
        name: share.name,
        createdAt: share.createdAt,
        creatorUsername: share.creator?.username,
      },
      files: share.files.map((f) => ({
        id: f.id,
        name: f.name,
        storageName: f.storageName,
      })),
      buildStoragePath: (s) => {
        const folder = buildShareFolderName("shareId", {
          id: s.id,
          name: s.name,
          createdAt: s.createdAt,
          creatorUsername: s.creatorUsername,
        });
        return path.posix.join("Incoming", folder);
      },
      updateShareStoragePath: async (shareId, storagePath) => {
        await prisma.share.update({
          where: { id: shareId },
          data: { storagePath },
        });
      },
      updateFileStorageName: async (fileId, storageName) => {
        await prisma.file.update({
          where: { id: fileId },
          data: { storageName },
        });
      },
      dryRun,
    });

    totalMigrated += result.migratedFiles;
    totalSkipped += result.skippedFiles;

    console.log(
      `Share ${result.shareId}: migrated=${result.migratedFiles} skipped=${result.skippedFiles} path=${result.newStoragePath}` +
        (result.errors.length ? ` errors=${result.errors.join(",")}` : ""),
    );
  }

  console.log(
    `Done. migratedFiles=${totalMigrated} skippedFiles=${totalSkipped}`,
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
