import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import { ConfigService } from "src/config/config.service";
import { UPLOADS_DIRECTORY } from "src/constants";
import { I18nService } from "nestjs-i18n";
import {
  allocateDuplicateName,
  buildShareFolderName,
  FolderNamingScheme,
  resolveWithinRoot,
  sanitizeRelativePath,
  sanitizeShareDestination,
} from "./path.util";

export type ShareStorageInfo = {
  id: string;
  storagePath?: string | null;
  name?: string | null;
  createdAt?: Date;
  creator?: { username?: string | null } | null;
};

export type FileStorageInfo = {
  id: string;
  name: string;
  storageName?: string | null;
};

@Injectable()
export class StoragePathService {
  private readonly logger = new Logger(StoragePathService.name);

  constructor(
    private config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  getUploadsRoot(): string {
    return path.resolve(UPLOADS_DIRECTORY);
  }

  /**
   * Relative path of a share directory under the uploads root.
   * Legacy shares (no storagePath) live under shares/{id}.
   */
  getShareRelativePath(share: ShareStorageInfo): string {
    if (share.storagePath) {
      return share.storagePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    }
    return path.posix.join("shares", share.id);
  }

  getShareAbsolutePath(share: ShareStorageInfo): string {
    return resolveWithinRoot(
      this.getUploadsRoot(),
      this.getShareRelativePath(share),
    );
  }

  getDisplayPath(share: ShareStorageInfo): string {
    const absolute = this.getShareAbsolutePath(share);
    const prefix = this.config.get("share.displayPathPrefix");
    if (prefix && typeof prefix === "string" && prefix.trim()) {
      const relative = this.getShareRelativePath(share);
      return path.posix.join(
        prefix.replace(/\\/g, "/").replace(/\/+$/, ""),
        relative,
      );
    }
    return absolute;
  }

  /**
   * Absolute path to a file on disk. Uses storageName when set (native layout),
   * otherwise falls back to opaque file id (legacy object layout).
   */
  getFileAbsolutePath(share: ShareStorageInfo, file: FileStorageInfo): string {
    const shareDir = this.getShareAbsolutePath(share);
    if (file.storageName) {
      return resolveWithinRoot(shareDir, file.storageName);
    }
    return resolveWithinRoot(shareDir, file.id);
  }

  getTempChunkPath(share: ShareStorageInfo, fileId: string): string {
    const shareDir = this.getShareAbsolutePath(share);
    return path.join(shareDir, ".pingvin-tmp", `${fileId}.tmp-chunk`);
  }

  getArchivePath(share: ShareStorageInfo): string {
    return path.join(this.getShareAbsolutePath(share), "archive.zip");
  }

  /**
   * Allocate a unique relative storage name for an uploaded file,
   * preserving nested folders and appending (n) on collisions.
   */
  async allocateStorageName(
    share: ShareStorageInfo,
    originalName: string,
    existingStorageNames: string[],
  ): Promise<string> {
    let relative: string;
    try {
      relative = sanitizeRelativePath(originalName);
    } catch {
      throw new BadRequestException(this.i18n.t("file.invalidPath"));
    }

    const existing = new Set(
      existingStorageNames
        .filter(Boolean)
        .map((name) => name.replace(/\\/g, "/")),
    );

    // Also treat on-disk names as taken (e.g. archive.zip, leftover files)
    const shareDir = this.getShareAbsolutePath(share);
    const onDisk = await this.listRelativeFiles(shareDir);
    for (const diskName of onDisk) {
      existing.add(diskName);
    }

    return allocateDuplicateName(relative, existing);
  }

  /**
   * Compute storagePath for a newly created share based on config.
   */
  async allocateShareStoragePath(share: {
    id: string;
    name?: string | null;
    createdAt?: Date;
    creatorUsername?: string | null;
  }): Promise<string> {
    const scheme = (this.config.get("share.folderNamingScheme") ||
      "shareId") as FolderNamingScheme;
    const template = this.config.get("share.folderNamingTemplate") as string;
    const incoming = (this.config.get("share.incomingFolder") || "")
      .toString()
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "");

    let folderName = buildShareFolderName(scheme, share, template);

    const uploadsRoot = this.getUploadsRoot();
    const baseRelative = incoming
      ? (() => {
          try {
            return sanitizeRelativePath(incoming);
          } catch {
            throw new BadRequestException(
              this.i18n.t("share.invalidIncomingFolder"),
            );
          }
        })()
      : "";

    let relativePath = baseRelative
      ? path.posix.join(baseRelative, folderName)
      : folderName;

    // Ensure uniqueness under uploads root
    let counter = 1;
    while (await this.pathExists(resolveWithinRoot(uploadsRoot, relativePath))) {
      const suffix = ` (${counter})`;
      const uniqueFolder = `${folderName}${suffix}`;
      relativePath = baseRelative
        ? path.posix.join(baseRelative, uniqueFolder)
        : uniqueFolder;
      counter += 1;
    }

    return relativePath;
  }

  async ensureShareDirectory(share: ShareStorageInfo): Promise<string> {
    const absolute = this.getShareAbsolutePath(share);
    await fs.mkdir(absolute, { recursive: true });
    await fs.mkdir(path.join(absolute, ".pingvin-tmp"), { recursive: true });
    return absolute;
  }

  async moveShareDirectory(
    share: ShareStorageInfo,
    destinationRelative: string,
  ): Promise<string> {
    let sanitizedDest: string;
    try {
      sanitizedDest = sanitizeShareDestination(destinationRelative);
    } catch {
      throw new BadRequestException(this.i18n.t("share.invalidMoveDestination"));
    }

    const uploadsRoot = this.getUploadsRoot();
    const currentAbsolute = this.getShareAbsolutePath(share);
    const targetAbsolute = resolveWithinRoot(uploadsRoot, sanitizedDest);

    if (path.resolve(currentAbsolute) === path.resolve(targetAbsolute)) {
      return sanitizedDest;
    }

    if (await this.pathExists(targetAbsolute)) {
      throw new BadRequestException(this.i18n.t("share.moveDestinationExists"));
    }

    // Ensure target parent exists
    await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });

    try {
      await fs.rename(currentAbsolute, targetAbsolute);
    } catch (err: any) {
      // Cross-device: fall back to recursive copy + remove
      this.logger.warn(
        `rename failed for share ${share.id}, falling back to copy: ${err?.message}`,
      );
      await this.copyDirectory(currentAbsolute, targetAbsolute);
      await fs.rm(currentAbsolute, { recursive: true, force: true });
    }

    return sanitizedDest;
  }

  private async pathExists(absolutePath: string): Promise<boolean> {
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  private async listRelativeFiles(absoluteDir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      await this.walkDir(absoluteDir, absoluteDir, results);
    } catch {
      return [];
    }
    return results;
  }

  private async walkDir(
    root: string,
    current: string,
    results: string[],
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === ".pingvin-tmp") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await this.walkDir(root, full, results);
      } else {
        results.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}
