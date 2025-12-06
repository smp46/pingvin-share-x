import { Divider, Flex, Progress, Stack, Text, Collapse } from "@mantine/core";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import moment from "moment";
import { FormattedMessage } from "react-intl";
import { translateOutsideContext } from "../../hooks/useTranslate.hook";
import { MyShare } from "../../types/share.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import CopyTextField from "../upload/CopyTextField";
import QRCode from "../share/QRCode";
import { useState } from "react";

const showShareInformationsModal = (
  modals: ModalsContextProps,
  share: MyShare,
  maxShareSize: number,
) => {
  const t = translateOutsideContext();

  return modals.openModal({
    title: t("account.shares.modal.share-informations"),
    children: <Body share={share} maxShareSize={maxShareSize} />,
  });
};

const Body = ({
  share,
  maxShareSize,
}: {
  share: MyShare;
  maxShareSize: number;
}) => {
  const [showQR, setShowQR] = useState(false);

  const handleToggleQR = () => {
    setShowQR(!showQR);
  };

  const link = `${window.location.origin}/s/${share.id}`;

  const formattedShareSize = byteToHumanSizeString(share.size);
  const formattedMaxShareSize = byteToHumanSizeString(maxShareSize);
  const shareSizeProgress = (share.size / maxShareSize) * 100;

  const formattedCreatedAt = moment(share.createdAt).format("LLL");
  const formattedExpiration =
    moment(share.expiration).unix() === 0
      ? "Never"
      : moment(share.expiration).format("LLL");

  return (
    <Stack align="stretch" gap="md">
      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.id" />:{" "}
        </b>
        {share.id}
      </Text>
      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.name" />:{" "}
        </b>
        {share.name || "-"}
      </Text>

      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.description" />:{" "}
        </b>
        {share.description || "-"}
      </Text>

      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.createdAt" />:{" "}
        </b>
        {formattedCreatedAt}
      </Text>

      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.expiresAt" />:{" "}
        </b>
        {formattedExpiration}
      </Text>
      <Divider />
      <CopyTextField link={link} toggleQR={handleToggleQR} />
      <Collapse in={showQR}>
        <QRCode link={link} />
      </Collapse>
      <Divider />
      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.size" />:{" "}
        </b>
        {formattedShareSize} / {formattedMaxShareSize} (
        {shareSizeProgress.toFixed(1)}%)
      </Text>

      <Flex align="center" justify="center">
        {share.size / maxShareSize < 0.1 && (
          <Text size="xs" style={{ marginRight: "4px" }}>
            {formattedShareSize}
          </Text>
        )}
        <Progress.Root
          style={{ width: share.size / maxShareSize < 0.1 ? "70%" : "80%" }}
          size="xl"
          radius="xl"
        >
          <Progress.Section value={shareSizeProgress}>
            {share.size / maxShareSize >= 0.1 && (
              <Progress.Label>{formattedShareSize}</Progress.Label>
            )}
          </Progress.Section>
        </Progress.Root>
        <Text size="xs" style={{ marginLeft: "4px" }}>
          {formattedMaxShareSize}
        </Text>
      </Flex>
    </Stack>
  );
};

export default showShareInformationsModal;
