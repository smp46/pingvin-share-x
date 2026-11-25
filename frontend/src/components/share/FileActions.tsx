import { ActionIcon, Group, MantineNumberSize } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import { TbClipboard, TbDownload, TbEye, TbLink } from "react-icons/tb";
import useCopyFileLink from "../../hooks/useCopyFileLink.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import api from "../../services/api.service";
import shareService from "../../services/share.service";
import { FileMetaData } from "../../types/File.type";
import { Share } from "../../types/share.type";
import toast from "../../utils/toast.util";
import { HoverTip } from "../core/HoverTip";
import { ICON_SIZE } from "../core/FileTree";
import showFilePreviewModal from "./modals/showFilePreviewModal";

const FileActions = ({
  file,
  share,
  recipientId,
  spacing,
}: {
  file: FileMetaData;
  share: Share;
  recipientId?: string;
  spacing?: MantineNumberSize;
}) => {
  const clipboard = useClipboard();
  const modals = useModals();
  const t = useTranslate();
  const copyFileLink = useCopyFileLink(share, recipientId);

  return (
    <Group position="right" spacing={spacing} noWrap style={{ flexShrink: 0 }}>
      {shareService.isShareTextFile(file.name) && (
        <HoverTip label={t("share.copy-text-contents")} touch={false}>
          <ActionIcon
            color="blue"
            variant="light"
            size={ICON_SIZE}
            aria-label={t("share.copy-text-contents")}
            onClick={() => {
              api
                .get(`/shares/${share.id}/files/${file.id}?download=false`)
                .then((res) => {
                  if (window.isSecureContext) {
                    clipboard.copy(res.data);
                    toast.success(t("share.notify.copied-contents"));
                  } else {
                    toast.error(t("share.notify.copy-not-supported"));
                  }
                });
            }}
          >
            <TbClipboard />
          </ActionIcon>
        </HoverTip>
      )}
      {shareService.doesFileSupportPreview(file.name) && (
        <HoverTip label={t("common.button.preview")} touch={false}>
          <ActionIcon
            color="green"
            variant="light"
            size={ICON_SIZE}
            aria-label={t("common.button.preview")}
            onClick={() => showFilePreviewModal(share.id, file, modals)}
          >
            <TbEye />
          </ActionIcon>
        </HoverTip>
      )}
      {!share.hasPassword && (
        <HoverTip label={t("common.button.copy-link")} touch={false}>
          <ActionIcon
            color="victoria"
            variant="light"
            size={ICON_SIZE}
            aria-label={t("common.button.copy-link")}
            onClick={() => copyFileLink(file)}
          >
            <TbLink />
          </ActionIcon>
        </HoverTip>
      )}

      <HoverTip label={t("common.button.download")} touch={false}>
        <ActionIcon
          color="cyan"
          variant="light"
          size={ICON_SIZE}
          aria-label={t("common.button.download")}
          onClick={async () => {
            await shareService.downloadFile(share.id, file.id, recipientId);
          }}
        >
          <TbDownload />
        </ActionIcon>
      </HoverTip>
    </Group>
  );
};

export default FileActions;
