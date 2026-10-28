import { MantineThemeOverride } from "@mantine/core";

// "Inspection checkpoint" palette: paper, ink and a single safety-orange signal.
const signal: [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  "#FFF1EA",
  "#FFDCCB",
  "#FFBA9C",
  "#FF956A",
  "#FF7643",
  "#FF5A1F",
  "#F04A10",
  "#C93B0B",
  "#9E2F0B",
  "#6E220A",
];

export const DISPLAY_FONT = "'Space Grotesk', 'IBM Plex Sans', sans-serif";
export const BODY_FONT =
  "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const MONO_FONT = "'JetBrains Mono', ui-monospace, Menlo, monospace";

export default <MantineThemeOverride>{
  white: "#FBF9F4",
  black: "#16130F",
  colors: {
    // `victoria` is the historical primary key stored in admin config; it now
    // resolves to safety orange so existing installs pick up the new identity.
    victoria: signal,
    signal,
    orange: signal,
    gray: [
      "#F7F4EE",
      "#EDE9E0",
      "#E2DCD0",
      "#D2CABB",
      "#B8AF9F",
      "#968D7E",
      "#6B6458",
      "#524C43",
      "#39342E",
      "#221F1B",
    ],
    dark: [
      "#EDE8DD",
      "#CFC8BA",
      "#A39B8E",
      "#7A7368",
      "#4A453F",
      "#36322D",
      "#24211E",
      "#121110",
      "#0D0C0B",
      "#080707",
    ],
    green: [
      "#E9F5EE",
      "#CBE7D6",
      "#A3D4B6",
      "#74BC91",
      "#4AA36F",
      "#2E8A57",
      "#1F7145",
      "#175A37",
      "#11452A",
      "#0A2F1C",
    ],
  },
  primaryColor: "victoria",
  primaryShade: { light: 5, dark: 5 },
  defaultRadius: "sm",
  radius: {
    xs: "0.125rem",
    sm: "0.1875rem",
    md: "0.25rem",
    lg: "0.375rem",
    xl: "0.625rem",
  },
  fontFamily: BODY_FONT,
  fontFamilyMonospace: MONO_FONT,
  headings: {
    fontFamily: DISPLAY_FONT,
    fontWeight: 700,
  },
  shadows: {
    xs: "0 1px 0 rgba(22,19,15,0.08)",
    sm: "0 1px 0 rgba(22,19,15,0.10)",
    md: "0 2px 0 rgba(22,19,15,0.10)",
    lg: "0 4px 0 rgba(22,19,15,0.10)",
    xl: "0 8px 0 rgba(22,19,15,0.10)",
  },
  components: {
    Button: {
      styles: (theme, params: { variant?: string; color?: string }) => {
        const isPrimary =
          !params.color ||
          params.color === theme.primaryColor ||
          params.color === "victoria" ||
          params.color === "orange";
        return {
          root: {
            fontFamily: DISPLAY_FONT,
            fontWeight: 600,
            letterSpacing: "0.01em",
            ...(params.variant === "filled" || !params.variant
              ? isPrimary
                ? {
                    color: theme.black,
                    border: `1.5px solid ${theme.black}`,
                    "&:not(:disabled):hover": {
                      backgroundColor: theme.colors.victoria[4],
                    },
                  }
                : {}
              : {}),
          },
        };
      },
    },
    ActionIcon: {
      styles: (theme, params: { variant?: string; color?: string }) => ({
        root:
          params.variant === "filled" &&
          (params.color === "victoria" || params.color === "orange")
            ? { color: theme.black, border: `1.5px solid ${theme.black}` }
            : {},
      }),
    },
    Modal: {
      styles: (theme) => ({
        title: {
          fontFamily: DISPLAY_FONT,
          fontSize: theme.fontSizes.lg,
          fontWeight: 700,
        },
        content: {
          border: `1.5px solid ${theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.black}`,
        },
      }),
    },
    Badge: {
      styles: () => ({
        root: { fontFamily: MONO_FONT, letterSpacing: "0.06em" },
      }),
    },
    Table: {
      styles: (theme) => ({
        root: {
          "& thead tr th": {
            fontFamily: MONO_FONT,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
            color:
              theme.colorScheme === "dark"
                ? theme.colors.dark[2]
                : theme.colors.gray[7],
            borderBottom: `1.5px solid ${theme.colorScheme === "dark" ? theme.colors.dark[3] : theme.black}`,
          },
        },
      }),
    },
  },
};
