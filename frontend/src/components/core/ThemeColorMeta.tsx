import { useMantineTheme } from "@mantine/core";
import Head from "next/head";

const ThemeColorMeta = () => {
  const theme = useMantineTheme();
  return (
    <Head>
      <meta name="theme-color" content={theme.fn.primaryColor()} />
    </Head>
  );
};

export default ThemeColorMeta;
