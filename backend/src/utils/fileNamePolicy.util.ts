export const BLOCKED_EXTENSIONS: readonly string[] = [
  "exe",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "js",
  "html",
  "htm",
  "svg",
  "xhtml",
  "msi",
  "scr",
  "jar",
  "apk",
  "dll",
];

export function isBlockedFileName(name: string): boolean {
  const normalized = name.trim().replace(/[.\s]+$/u, "");
  if (normalized.startsWith(".")) return true;

  return normalized
    .split(".")
    .slice(1)
    .some((extension) => BLOCKED_EXTENSIONS.includes(extension.toLowerCase()));
}
