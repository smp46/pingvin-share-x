import { ColorSchemeProvider, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { IntlProvider } from "react-intl";
import { ConfigContext } from "../hooks/config.hook";
import { UserContext } from "../hooks/user.hook";
import translations from "../i18n/translations/en-US";
import Config from "../types/config.type";
import User from "../types/user.type";
import { getDefaultConfig } from "../utils/defaultConfig.util";

// Components here read their settings and their signed in user from context,
// so a test can supply real providers with test values instead of standing in
// for the hooks. Config starts from the same defaults the app falls back to,
// and a test overrides only the keys its case is actually about.

type Options = {
  config?: Record<string, string>;
  user?: User | null;
  colorScheme?: "light" | "dark";
};

const configVariables = (overrides: Record<string, string> = {}): Config[] =>
  getDefaultConfig().map((variable) =>
    variable.key in overrides
      ? { ...variable, value: overrides[variable.key] }
      : variable,
  );

export const withProviders = (
  ui: ReactElement,
  { config = {}, user = null, colorScheme = "light" }: Options = {},
) => (
  <IntlProvider locale="en-US" messages={translations}>
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={() => undefined}
    >
      <MantineProvider theme={{ colorScheme }}>
        <UserContext.Provider
          value={{ user, refreshUser: async () => user }}
        >
          <ConfigContext.Provider
            value={{
              configVariables: configVariables(config),
              refresh: async () => undefined,
            }}
          >
            <ModalsProvider>{ui}</ModalsProvider>
          </ConfigContext.Provider>
        </UserContext.Provider>
      </MantineProvider>
    </ColorSchemeProvider>
  </IntlProvider>
);

export const renderWithProviders = (ui: ReactElement, options?: Options) =>
  render(withProviders(ui, options));
