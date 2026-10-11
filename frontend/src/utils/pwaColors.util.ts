// Page background of the light and dark color scheme (Mantine: white / dark.7).
// Keep in sync with MASKABLE_BACKGROUNDS in backend/src/config/logo.service.ts
export const PWA_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#1a1b1e",
} as const;

export type PwaScheme = keyof typeof PWA_BACKGROUNDS;

/**
 * A manifest only knows a single color. "light" and "dark" are used as
 * configured, "system" falls back to light.
 */
export const getPwaScheme = (colorScheme: string): PwaScheme =>
  colorScheme === "dark" ? "dark" : "light";
