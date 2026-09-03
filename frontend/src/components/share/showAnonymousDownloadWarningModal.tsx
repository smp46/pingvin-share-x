import { Alert, Button, Stack } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { useEffect, useState } from "react";
import { TbAlertTriangle } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate, {
  translateOutsideContext,
} from "../../hooks/useTranslate.hook";

const COUNTDOWN_SECONDS = 5;

const showAnonymousDownloadWarningModal = (
  modals: ModalsContextProps,
  confirmCallback: () => void,
) => {
  const t = translateOutsideContext();
  return modals.openModal({
    title: t("share.modal.anonymous-warning.title"),
    children: <Body confirmCallback={confirmCallback} />,
  });
};

const Body = ({ confirmCallback }: { confirmCallback: () => void }) => {
  const modals = useModals();
  const t = useTranslate();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <Stack align="stretch">
      <Alert variant="light" color="yellow" icon={<TbAlertTriangle />}>
        <FormattedMessage id="share.modal.anonymous-warning.description" />
      </Alert>

      <Button
        disabled={secondsLeft > 0}
        onClick={() => {
          modals.closeAll();
          confirmCallback();
        }}
      >
        {secondsLeft > 0
          ? t("share.modal.anonymous-warning.button.countdown", {
              seconds: secondsLeft,
            })
          : t("share.modal.anonymous-warning.button.ready")}
      </Button>
    </Stack>
  );
};

export default showAnonymousDownloadWarningModal;
