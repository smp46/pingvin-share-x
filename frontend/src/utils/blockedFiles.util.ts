// UX mirror of the server policy. The server remains the enforcement boundary.
export const BLOCKED_FILE_EXTENSIONS = new Set([
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
]);

export const hasBlockedFileExtension = (name: string): boolean => {
  const basename = name.replace(/\\/g, "/").split("/").pop() || "";
  return basename
    .replace(/[.\s]+$/, "")
    .toLowerCase()
    .split(".")
    .slice(1)
    .some((extension) => BLOCKED_FILE_EXTENSIONS.has(extension.trim()));
};

export const filterBlockedFiles = <T extends { name: string }>(
  files: T[],
  onBlocked: (name: string) => void,
): T[] =>
  files.filter((file) => {
    if (!hasBlockedFileExtension(file.name)) return true;
    onBlocked(file.name);
    return false;
  });
