import * as fs from "fs/promises";
import * as path from "path";
import {
  allocateDuplicateName,
  sanitizeRelativePath,
} from "../storage/path.util";

export type MigratableShare = {
  id: string;
  storagePath: string | null;
  storageProvider: string;
  name?: string | null;
  createdAt: Date;
  creatorUsername?: string | null;
};

export type MigratableFile = {
  id: string;
  name: string;
  storageName: string | null;
};

export type MigrationResult = {
  shareId: string;
  migratedFiles: number;
  skippedFiles: number;
  newStoragePath: string;
  errors: string[];
};

/**
 * Convert a legacy opaque-ID share directory into the native filename layout.
 * Safe to re-run: files that already have storageName are skipped.
 */
export async function migrateShareToNativeLayout(options: {
  uploadsRoot: string;
  share: MigratableShare;
  files: MigratableFile[];
  buildStoragePath: (share: MigratableShare) => Promise<string> | string;
  updateShareStoragePath: (shareId: string, storagePath: string) => Promise<void>;
  updateFileStorageName: (fileId: string, storageName: string) => Promise<void>;
  dryRun?: boolean;
}): Promise<MigrationResult> {
  const {
    uploadsRoot,
    share,
    files,
    buildStoragePath,
    updateShareStoragePath,
    updateFileStorageName,
    dryRun = false,
  } = options;

  const result: MigrationResult = {
    shareId: share.id,
    migratedFiles: 0,
    skippedFiles: 0,
    newStoragePath: share.storagePath || path.posix.join("shares", share.id),
    errors: [],
  };

  if (share.storageProvider !== "LOCAL") {
    result.errors.push("not_local");
    return result;
  }

  const legacyRelative = path.posix.join("shares", share.id);
  const legacyAbsolute = path.resolve(uploadsRoot, legacyRelative);

  let currentRelative = share.storagePath || legacyRelative;
  let currentAbsolute = path.resolve(uploadsRoot, currentRelative);

  // If still on legacy path, move/rename the share folder first
  if (!share.storagePath) {
    const targetRelative = await buildStoragePath(share);
    const targetAbsolute = path.resolve(uploadsRoot, targetRelative);

    if (path.resolve(currentAbsolute) !== path.resolve(targetAbsolute)) {
      if (!dryRun) {
        await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
        try {
          await fs.access(legacyAbsolute);
          await fs.rename(legacyAbsolute, targetAbsolute);
        } catch (err: any) {
          if (err?.code !== "ENOENT") {
            result.errors.push(`move_share:${err?.message || err}`);
            return result;
          }
        }
        await updateShareStoragePath(share.id, targetRelative);
      }
      currentRelative = targetRelative;
      currentAbsolute = targetAbsolute;
    } else if (!dryRun) {
      await updateShareStoragePath(share.id, targetRelative);
      currentRelative = targetRelative;
    }
    result.newStoragePath = currentRelative;
  }

  const usedNames = new Set(
    files.filter((f) => f.storageName).map((f) => f.storageName!),
  );

  for (const file of files) {
    if (file.storageName) {
      result.skippedFiles += 1;
      continue;
    }

    try {
      const sanitized = sanitizeRelativePath(file.name);
      const storageName = allocateDuplicateName(sanitized, usedNames);
      usedNames.add(storageName);

      const sourcePath = path.join(currentAbsolute, file.id);
      const destPath = path.join(currentAbsolute, ...storageName.split("/"));

      if (!dryRun) {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.rename(sourcePath, destPath);
        await updateFileStorageName(file.id, storageName);
      }

      result.migratedFiles += 1;
    } catch (err: any) {
      result.errors.push(`file:${file.id}:${err?.message || err}`);
    }
  }

  result.newStoragePath = currentRelative;
  return result;
}
