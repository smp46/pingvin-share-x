import { Anchor, Title, useMantineColorScheme } from "@mantine/core";
import Meta from "../../components/Meta";
import useTranslate from "../../hooks/useTranslate.hook";
import { FormattedMessage } from "react-intl";
import useConfig from "../../hooks/config.hook";
import Markdown from "markdown-to-jsx";

const Imprint = () => {
  const t = useTranslate();
  const config = useConfig();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <>
      <Meta title={t("imprint.title")} />
      <Title mb={30} order={1}>
        <FormattedMessage id="imprint.title" />
      </Title>
      <Markdown
        options={{
          forceBlock: true,
          overrides: {
            pre: {
              props: {
                style: {
                  backgroundColor: isDark ? "rgba(50, 50, 50, 0.5)" : "rgba(220, 220, 220, 0.5)",
                  padding: "0.75em",
                  whiteSpace: "pre-wrap",
                },
              },
            },
            table: {
              props: {
                className: "md",
              },
            },
            a: {
              props: {
                target: "_blank",
                rel: "noreferrer",
              },
              component: Anchor,
            },
          },
        }}
      >
        {config.get("legal.imprintText")}
      </Markdown>
    </>
  );
};

export default Imprint;
