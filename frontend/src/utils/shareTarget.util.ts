import { FileUpload } from "../types/File.type";

// Must match the cache name used in frontend/worker/index.js
const SHARE_TARGET_CACHE = "share-target";

/**
 * Reads files that were shared to the installed web app (Web Share Target API)
 * from the cache filled by the service worker and removes them from the cache.
 */
export const consumeSharedFiles = async (): Promise<FileUpload[]> => {
  if (typeof window === "undefined" || !("caches" in window)) return [];

  try {
    if (!(await caches.has(SHARE_TARGET_CACHE))) return [];

    const cache = await caches.open(SHARE_TARGET_CACHE);
    const requests = await cache.keys();
    const files: FileUpload[] = [];

    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;

      const blob = await response.blob();
      const name = decodeURIComponent(
        response.headers.get("X-File-Name") ?? "shared-file",
      );
      const lastModified = parseInt(
        response.headers.get("X-File-Last-Modified") ?? "",
      );

      const file = new File([blob], name, {
        type: blob.type,
        lastModified: isNaN(lastModified) ? Date.now() : lastModified,
      }) as FileUpload;
      file.uploadingProgress = 0;
      files.push(file);
    }

    await caches.delete(SHARE_TARGET_CACHE);
    return files;
  } catch (e) {
    console.error("Failed to read shared files", e);
    return [];
  }
};
