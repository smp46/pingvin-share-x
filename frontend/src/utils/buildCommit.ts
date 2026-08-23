// The image is stamped with the commit it was built from, so two builds of
// the same beta version can be told apart. Seven characters is what git shows
// by default and what someone would paste into a search, so that is what the
// admin page displays.
//
// Anything that is not a commit hash yields nothing at all: an unset build
// argument arrives as an empty string, and a placeholder like "unknown" should
// not be trimmed down and shown as though it were real.
export function shortCommit(commit: string | undefined): string {
  const trimmed = (commit ?? "").trim();
  if (!/^[0-9a-f]{7,40}$/i.test(trimmed)) return "";
  return trimmed.slice(0, 7).toLowerCase();
}
