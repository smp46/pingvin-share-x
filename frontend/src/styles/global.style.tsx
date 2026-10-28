import { Global } from "@mantine/core";

// Design tokens are emitted as CSS variables so plain CSS (checkpoint.css)
// follows Mantine's light/dark switch.
const GlobalStyle = () => {
  return (
    <Global
      styles={(theme) => {
        const dark = theme.colorScheme == "dark";
        return {
          ":root": dark
            ? {
                "--rv-bg": "#121110",
                "--rv-surface": "#1B1917",
                "--rv-ink": "#EDE8DD",
                "--rv-muted": "#A39B8E",
                "--rv-line": "#4A453F",
                "--rv-line-strong": "#EDE8DD",
                "--rv-signal": "#FF6A33",
                "--rv-signal-ink": "#16130F",
                "--rv-ok": "#5CC48A",
                "--rv-ok-bg": "rgba(92,196,138,0.12)",
                "--rv-revoked": "#A39B8E",
                "--rv-hazard-a": "#FF6A33",
                "--rv-hazard-b": "#16130F",
              }
            : {
                "--rv-bg": "#F4F1EA",
                "--rv-surface": "#FBF9F4",
                "--rv-ink": "#16130F",
                "--rv-muted": "#5E574C",
                "--rv-line": "#D2CABB",
                "--rv-line-strong": "#16130F",
                "--rv-signal": "#FF5A1F",
                "--rv-signal-ink": "#16130F",
                "--rv-ok": "#1F7145",
                "--rv-ok-bg": "rgba(31,113,69,0.10)",
                "--rv-revoked": "#524C43",
                "--rv-hazard-a": "#FF5A1F",
                "--rv-hazard-b": "#16130F",
              },
          body: {
            backgroundColor: dark ? "#121110" : "#F4F1EA",
            color: dark ? theme.colors.dark[0] : theme.black,
            WebkitFontSmoothing: "antialiased",
          },
          "::selection": {
            background: theme.colors.victoria[5],
            color: theme.black,
          },
          a: {
            color: "inherit",
            textDecoration: "none",
          },
          ".mantine-Header-root, .mantine-Footer-root": {
            backgroundColor: dark ? "#121110" : "#F4F1EA",
            borderColor: dark ? theme.colors.dark[4] : theme.black,
          },
          "table.md, table.md th:nth-of-type(odd), table.md td:nth-of-type(odd)":
            {
              background: dark
                ? "rgba(237, 232, 221, 0.06)"
                : "rgba(22, 19, 15, 0.05)",
            },
          "table.md td": {
            paddingLeft: "0.5em",
            paddingRight: "0.5em",
          },
        };
      }}
    />
  );
};
export default GlobalStyle;
