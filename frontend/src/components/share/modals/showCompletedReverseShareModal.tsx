import { Button, Stack, Collapse } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { FormattedMessage } from "react-intl";
import { useState } from "react";
import { translateOutsideContext } from "../../../hooks/useTranslate.hook";
import CopyTextField from "../../upload/CopyTextField";
import QRCode from "../../share/QRCode";

const showCompletedReverseShareModal = (
  modals: ModalsContextProps,
  link: string,
  getReverseShares: () => void,
) => {
  const t = translateOutsideContext();
  return modals.openModal({
    closeOnClickOutside: false,
    withCloseButton: false,
    closeOnEscape: false,
    title: t("account.reverseShares.modal.reverse-share-link"),
    children: <Body link={link} getReverseShares={getReverseShares} />,
  });
};

const Body = ({
  link,
  getReverseShares,
}: {
  link: string;
  getReverseShares: () => void;
}) => {
  const modals = useModals();

  const [showQR, setShowQR] = useState(false);

  const handleToggleQR = () => {
    setShowQR(!showQR);
  };

  return (
    <Stack align="stretch">
      <CopyTextField link={link} toggleQR={handleToggleQR} />
      <Collapse in={showQR}>
        <QRCode link={link} />
      </Collapse>
      <Button
        onClick={() => {
          modals.closeAll();
          getReverseShares();
        }}
      >
        <FormattedMessage id="common.button.done" />
      </Button>
    </Stack>
  );
};

export default showCompletedReverseShareModal;
