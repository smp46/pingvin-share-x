import { ColorSchemeProvider, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import Logo from "./Logo";

// Written against the previous implementation first, so that the refactor that
// follows has to keep every one of these true rather than merely compile.
//
// The behaviour worth protecting: the dark logo is used in dark mode, a source
// that fails to load falls back to the default, and changing the colour scheme
// gives the preferred logo another try instead of leaving the fallback stuck.

const wrapped = (colorScheme: "light" | "dark") => (
  <ColorSchemeProvider
    colorScheme={colorScheme}
    toggleColorScheme={() => undefined}
  >
    <MantineProvider theme={{ colorScheme }}>
      <Logo height={40} width={40} />
    </MantineProvider>
  </ColorSchemeProvider>
);

const renderLogo = (colorScheme: "light" | "dark") =>
  render(wrapped(colorScheme));

const logo = () => screen.getByAltText("logo");

describe("Logo", () => {
  it("uses the light logo in light mode", () => {
    renderLogo("light");
    expect(logo()).toHaveAttribute("src", "/img/logo.png");
  });

  it("uses the dark logo in dark mode", () => {
    renderLogo("dark");
    expect(logo()).toHaveAttribute("src", "/img/logo-dark.png");
  });

  it("falls back to the default logo when the dark one fails to load", () => {
    renderLogo("dark");
    fireEvent.error(logo());
    expect(logo()).toHaveAttribute("src", "/img/logo.png");
  });

  it("tries the preferred logo again after the colour scheme changes", () => {
    const { rerender } = renderLogo("dark");
    fireEvent.error(logo());
    expect(logo()).toHaveAttribute("src", "/img/logo.png");

    rerender(wrapped("light"));
    expect(logo()).toHaveAttribute("src", "/img/logo.png");

    rerender(wrapped("dark"));
    expect(logo()).toHaveAttribute("src", "/img/logo-dark.png");
  });

  // the fallback failing too must not send it round again
  it("stops when the default logo itself fails", () => {
    renderLogo("light");
    fireEvent.error(logo());
    fireEvent.error(logo());
    expect(logo()).toHaveAttribute("src", "/img/logo.png");
  });

  it("passes the size through", () => {
    renderLogo("light");
    expect(logo()).toHaveAttribute("height", "40");
    expect(logo()).toHaveAttribute("width", "40");
  });
});
