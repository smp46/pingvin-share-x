export function safeRedirectPath(path: string | undefined) {
  if (!path) return "/";

  if (!path.startsWith("/")) return `/${path}`;

  return path;
}

export function getQueryString(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}
