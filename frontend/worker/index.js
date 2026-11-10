const SHARE_TARGET_PATH = "/share-target";
const SHARE_TARGET_CACHE = "share-target";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

const indexOfBytes = (haystack, needle, from = 0) => {
  const first = needle[0];
  const limit = haystack.length - needle.length;
  for (let i = from; i <= limit; i++) {
    if (haystack[i] !== first) continue;
    let j = 1;
    while (j < needle.length && haystack[i + j] === needle[j]) j++;
    if (j === needle.length) return i;
  }
  return -1;
};

const getBoundary = (contentType, bytes) => {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (match) return (match[1] || match[2]).trim();

  const lineEnd = indexOfBytes(bytes, encoder.encode("\r\n"));
  if (lineEnd > 2 && bytes[0] === 45 && bytes[1] === 45) {
    return decoder.decode(bytes.subarray(2, lineEnd));
  }
  return null;
};

const parseMultipartFiles = (buffer, contentType) => {
  const bytes = new Uint8Array(buffer);
  const boundary = getBoundary(contentType, bytes);
  if (!boundary) return [];

  const delimiter = encoder.encode(`--${boundary}`);
  const headerEnd = encoder.encode("\r\n\r\n");
  const files = [];

  let pos = indexOfBytes(bytes, delimiter, 0);
  while (pos !== -1) {
    const partStart = pos + delimiter.length;
    if (bytes[partStart] === 45 && bytes[partStart + 1] === 45) break;

    const next = indexOfBytes(bytes, delimiter, partStart);
    if (next === -1) break;

    const headersStart = partStart + 2;
    const headersEnd = indexOfBytes(bytes, headerEnd, headersStart);
    if (headersEnd !== -1 && headersEnd < next) {
      const headers = decoder.decode(bytes.subarray(headersStart, headersEnd));
      const filename = /filename="([^"]*)"/i.exec(headers);
      if (filename) {
        const type = /content-type:\s*([^\r\n]+)/i.exec(headers);
        const dataStart = headersEnd + 4;
        const dataEnd = Math.max(dataStart, next - 2);
        files.push(
          new File(
            [bytes.slice(dataStart, dataEnd)],
            filename[1] || "shared-file",
            { type: type ? type[1].trim() : "" },
          ),
        );
      }
    }
    pos = next;
  }

  return files;
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "POST" || url.pathname !== SHARE_TARGET_PATH) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const contentType = event.request.headers.get("content-type") || "";
        const body = await event.request.arrayBuffer();

        let files = [];
        try {
          const formData = await new Response(body, {
            headers: { "Content-Type": contentType },
          }).formData();
          for (const [, value] of formData.entries()) {
            if (typeof value !== "string") files.push(value);
          }
        } catch {
          files = parseMultipartFiles(body, contentType);
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

      return Response.redirect(new URL("/upload", self.location.origin), 303);
    })(),
  );
});
