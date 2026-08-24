// Where to send someone after signing in, from a value carried in the query
// string. It has to stay on this site: a redirect that leaves is a phishing
// link, since the victim follows a genuine link to this app, signs in, and is
// handed to a lookalike.
//
// Checking that it starts with a slash is not enough. "//host" starts with one
// and is a protocol relative url, which the browser reads as https://host, and
// browsers normalise the backslash spellings to the same thing. So rather than
// pattern matching the ways a string can name another origin, resolve it
// against an origin we control and keep it only if it stayed there.
const REDIRECT_BASE = "https://redirect.invalid";

export function safeRedirectPath(path: string | undefined) {
  if (!path) return "/";

  // control characters and surrounding space are stripped by the browser
  // before it parses a url, so strip them before deciding
  const cleaned = path.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!cleaned) return "/";

  try {
    const url = new URL(cleaned, REDIRECT_BASE);
    if (url.origin !== REDIRECT_BASE) return "/";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function getQueryString(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}
