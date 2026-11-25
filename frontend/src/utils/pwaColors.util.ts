import { DEFAULT_THEME } from "@mantine/core";
import globalStyle from "../styles/mantine.style";

export const PWA_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#1a1b1e",
} as const;

export type PwaScheme = keyof typeof PWA_BACKGROUNDS;

export const getPwaScheme = (colorScheme: string): PwaScheme =>
  colorScheme === "dark" ? "dark" : "light";

const PRIMARY_SHADES: Record<PwaScheme, number> = { light: 6, dark: 8 };
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const PALETTES: Record<string, readonly string[]> = {
  ...DEFAULT_THEME.colors,
  ...(globalStyle.colors as Record<string, readonly string[]>),
};

export const getPwaThemeColor = (
  primaryColor: string,
  primaryColorOverride: string,
  scheme: PwaScheme,
): string => {
  if (
    primaryColor === "custom" &&
    HEX_COLOR_PATTERN.test(primaryColorOverride)
  ) {
    return primaryColorOverride.toLowerCase();
  }

  const palette = PALETTES[primaryColor] ?? PALETTES.victoria;
  return palette[PRIMARY_SHADES[scheme]];
};
