import Head from "next/head";
import useConfig from "../hooks/config.hook";
import { useIntl } from "react-intl";
import english from "../i18n/translations/en-US";

const Meta = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => {
  const config = useConfig();
  const intl = useIntl();
  const metaDescription =
    description ??
    intl.formatMessage({
      id: "app.description",
      defaultMessage: english["app.description"],
    });

  const metaTitle = `${title} - ${config.get("general.appName")}`;

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="og:title" content={metaTitle} />
      <meta name="og:description" content={metaDescription} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
    </Head>
  );
};

export default Meta;
