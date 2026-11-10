export const PWA_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#1a1b1e",
} as const;

export type PwaScheme = keyof typeof PWA_BACKGROUNDS;

export const getPwaScheme = (colorScheme: string): PwaScheme =>
  colorScheme === "dark" ? "dark" : "light";
