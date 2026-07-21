import * as path from "path";

const INVALID_FILENAME_CHARS = /[<>:"|?*\x00-\x1f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Normalize and sanitize a relative file path from an upload.
 * Rejects path traversal and absolute paths. Preserves nested folders.
 */
export function sanitizeRelativePath(input: string): string {
  if (!input || typeof input !== "string") {
    throw new Error("invalid_path");
  }

  const withForwardSlashes = input.replace(/\\/g, "/");
  if (
    path.posix.isAbsolute(withForwardSlashes) ||
    /^[a-zA-Z]:/.test(withForwardSlashes) ||
    withForwardSlashes.startsWith("//")
  ) {
    throw new Error("path_traversal");
  }

  const normalized = withForwardSlashes.replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) {
    throw new Error("invalid_path");
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error("invalid_path");
  }

  const sanitizedSegments: string[] = [];
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error("path_traversal");
    }

    const cleaned = segment
      .replace(INVALID_FILENAME_CHARS, "_")
      .replace(/\.+$/g, "")
      .trim();

    if (!cleaned || cleaned === "." || cleaned === "..") {
      throw new Error("invalid_path");
    }

    if (WINDOWS_RESERVED.test(cleaned)) {
      sanitizedSegments.push(`_${cleaned}`);
    } else {
      sanitizedSegments.push(cleaned);
    }
  }

  return sanitizedSegments.join("/");
}

/**
 * Sanitize a single path segment used for share folder names.
 */
export function sanitizePathSegment(input: string, fallback = "share"): string {
  const cleaned = (input || "")
    .replace(/\\/g, "/")
    .split("/")
    .join("_")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/\.+$/g, "")
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return fallback;
  }

  if (WINDOWS_RESERVED.test(cleaned)) {
    return `_${cleaned}`;
  }

  return cleaned;
}

/**
 * Resolve a relative path under a root directory, ensuring the result stays inside root.
 */
export function resolveWithinRoot(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);

  const relative = path.relative(resolvedRoot, resolved);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.includes(`..${path.sep}`)
  ) {
    throw new Error("path_traversal");
  }

  return resolved;
}

/**
 * Append " (n)" before the extension when a filename collides.
 * photo.jpg → photo (1).jpg → photo (2).jpg
 */
export function allocateDuplicateName(
  relativePath: string,
  existingNames: Set<string>,
): string {
  const normalizedExisting = new Set(
    [...existingNames].map((name) => name.replace(/\\/g, "/")),
  );

  if (!normalizedExisting.has(relativePath)) {
    return relativePath;
  }

  const dir = path.posix.dirname(relativePath);
  const base = path.posix.basename(relativePath);
  const ext = path.posix.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;

  let counter = 1;
  while (true) {
    const candidateBase = `${stem} (${counter})${ext}`;
    const candidate =
      dir && dir !== "."
        ? path.posix.join(dir, candidateBase)
        : candidateBase;

    if (!normalizedExisting.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

export type FolderNamingScheme =
  | "shareId"
  | "dateShareId"
  | "shareName"
  | "uploaderDate"
  | "custom";

export type ShareFolderContext = {
  id: string;
  name?: string | null;
  createdAt?: Date;
  creatorUsername?: string | null;
};

/**
 * Build the share folder name from the configured naming scheme.
 */
export function buildShareFolderName(
  scheme: FolderNamingScheme | string,
  share: ShareFolderContext,
  template?: string,
): string {
  const date = share.createdAt ?? new Date();
  const dateStr = formatDate(date);
  const id = sanitizePathSegment(share.id, "share");
  const shareName = sanitizePathSegment(share.name || share.id, id);
  const uploader = sanitizePathSegment(share.creatorUsername || "anonymous", "anonymous");

  switch (scheme) {
    case "dateShareId":
      return `${dateStr}_${id}`;
    case "shareName":
      return shareName;
    case "uploaderDate":
      return `${uploader}_${dateStr}`;
    case "custom":
      return renderCustomTemplate(template || "Share-{id}", {
        id,
        shareName,
        uploader,
        date: dateStr,
      });
    case "shareId":
    default:
      return `Share-${id}`;
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderCustomTemplate(
  template: string,
  vars: { id: string; shareName: string; uploader: string; date: string },
): string {
  const rendered = template
    .replace(/\{id\}/gi, vars.id)
    .replace(/\{shareName\}/gi, vars.shareName)
    .replace(/\{name\}/gi, vars.shareName)
    .replace(/\{uploader\}/gi, vars.uploader)
    .replace(/\{date\}/gi, vars.date);

  return sanitizePathSegment(rendered, `Share-${vars.id}`);
}

/**
 * Normalize a relative destination for moving a share (under uploads root).
 */
export function sanitizeShareDestination(destination: string): string {
  const normalized = destination.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    throw new Error("invalid_path");
  }
  return sanitizeRelativePath(normalized);
}
