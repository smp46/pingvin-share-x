/**
 * Thrown when the client sent a syntactically valid `Range` that cannot be
 * served (RFC 7233 "416 Range Not Satisfiable"). Carries the resource's total
 * size so the controller can report it in the 416 `Content-Range` header.
 */
export class RangeNotSatisfiableError extends Error {
  constructor(public readonly size: number) {
    super("Range not satisfiable");
    this.name = "RangeNotSatisfiableError";
  }
}

/**
 * Parse a single-range HTTP `Range` header (RFC 7233) against a known total
 * size. Returns an inclusive `{ start, end }` byte range, or `null` when the
 * header is absent/malformed/multi-range, in which case the caller should fall
 * back to serving the whole file. Throws `RangeNotSatisfiableError` when the
 * range is valid syntax but cannot be served. Browsers only ever send a single
 * range for media playback, so multi-range support is intentionally omitted.
 */
export function parseRangeHeader(
  header: string,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return null;

  let start: number;
  let end: number;

  if (startStr === "") {
    // Suffix range: the final `endStr` bytes of the file.
    const suffixLength = parseInt(endStr, 10);
    if (suffixLength === 0) throw new RangeNotSatisfiableError(size);
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = parseInt(startStr, 10);
    end = endStr === "" ? size - 1 : parseInt(endStr, 10);
    // Clamp an over-long end to the last byte, as permitted by the spec.
    if (end > size - 1) end = size - 1;
  }

  if (start > end || start >= size) throw new RangeNotSatisfiableError(size);
  return { start, end };
}
