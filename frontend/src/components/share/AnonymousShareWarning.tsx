import { Alert } from "@mantine/core";
import { TbAlertTriangle } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";

const AnonymousShareWarning = () => {
  const t = useTranslate();

  return (
    <Alert
      mb="lg"
      variant="light"
      color="yellow"
      title={t("share.anonymous-warning.banner.title")}
      icon={<TbAlertTriangle />}
    >
      <FormattedMessage id="share.anonymous-warning.banner.description" />
    </Alert>
  );
};

export default AnonymousShareWarning;
