import { getQueryString, safeRedirectPath } from "./router.util";

// This decides where someone lands after signing in, from a value carried in
// the query string. Anything that leaves the site is a phishing link: the
// victim follows a genuine link to this app, signs in, and is handed to a
// lookalike.
//
// The cases below are the ways a string can name another origin while still
// looking like a path.

describe("safeRedirectPath", () => {
  it("keeps an ordinary path", () => {
    expect(safeRedirectPath("/account/shares")).toBe("/account/shares");
  });

  it("keeps a path with a query and a fragment", () => {
    expect(safeRedirectPath("/upload?a=1#top")).toBe("/upload?a=1#top");
  });

  it("makes a bare path absolute", () => {
    expect(safeRedirectPath("upload")).toBe("/upload");
  });

  it("falls back when there is nothing to go on", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  // "//host" is protocol relative: the browser reads it as https://host
  it("refuses a protocol relative url", () => {
    expect(safeRedirectPath("//evil.invalid")).toBe("/");
    expect(safeRedirectPath("///evil.invalid")).toBe("/");
  });

  // browsers normalise backslashes to forward slashes in the authority
  it("refuses the backslash spellings of the same thing", () => {
    expect(safeRedirectPath("/\\evil.invalid")).toBe("/");
    expect(safeRedirectPath("\\\\evil.invalid")).toBe("/");
    expect(safeRedirectPath("/\\/evil.invalid")).toBe("/");
  });

  it("refuses an absolute url", () => {
    expect(safeRedirectPath("https://evil.invalid")).toBe("/");
    expect(safeRedirectPath("http://evil.invalid/x")).toBe("/");
  });

  it("refuses a scheme that is not a location at all", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("data:text/html,<script>")).toBe("/");
  });

  // an encoded or padded spelling must not slip past the check either
  it("refuses whitespace padded and control character spellings", () => {
    expect(safeRedirectPath("  //evil.invalid")).toBe("/");
    expect(safeRedirectPath("\t/\\evil.invalid")).toBe("/");
    expect(safeRedirectPath("\n\rhttps://evil.invalid")).toBe("/");
  });
});

describe("getQueryString", () => {
  it("takes a single value", () => {
    expect(getQueryString("one")).toBe("one");
  });

  it("gives nothing for a repeated or missing parameter", () => {
    expect(getQueryString(["one", "two"])).toBeUndefined();
    expect(getQueryString(undefined)).toBeUndefined();
  });
});
