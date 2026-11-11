const SHARE_TARGET_PATH = "/share-target";
const SHARE_TARGET_CACHE = "share-target";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "POST" || url.pathname !== SHARE_TARGET_PATH) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();
        const files = [];
        for (const [, value] of formData.entries()) {
          if (typeof value !== "string") files.push(value);
        }

        await caches.delete(SHARE_TARGET_CACHE);
        const cache = await caches.open(SHARE_TARGET_CACHE);
        const timestamp = Date.now();

        await Promise.all(
          files.map((file, index) =>
            cache.put(
              new Request(`/share-target-files/${timestamp}-${index}`),
              new Response(file, {
                headers: {
                  "Content-Type": file.type || "application/octet-stream",
                  "X-File-Name": encodeURIComponent(file.name),
                  "X-File-Last-Modified": String(file.lastModified),
                  "X-Shared-At": String(timestamp),
                },
              }),
            ),
          ),
        );
      } catch (e) {
        console.error("Failed to store shared files", e);
      }

      return Response.redirect(
        new URL("/upload?shared=1", self.location.origin),
        303,
      );
    })(),
  );
});
