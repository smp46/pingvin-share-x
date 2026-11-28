import { Stack, TextInput } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import useConfig from "./config.hook";
import useTranslate from "./useTranslate.hook";
import { FileMetaData } from "../types/File.type";
import { Share } from "../types/share.type";
import toast from "../utils/toast.util";

const useCopyFileLink = (share: Share, recipientId?: string) => {
  const clipboard = useClipboard();
  const config = useConfig();
  const modals = useModals();
  const t = useTranslate();

  return (file: FileMetaData) => {
    const recipientQuery = recipientId
      ? `?recipient=${encodeURIComponent(recipientId)}`
      : "";
    const link = `${config.get("general.appUrl") !== config.get("general.appUrl", true) ? config.get("general.appUrl") : window.location.origin}/api/shares/${
      share.id
    }/files/${file.id}${recipientQuery}`;

    if (window.isSecureContext) {
      clipboard.copy(link);
      toast.success(t("common.notify.copied-link"));
    } else {
      modals.openModal({
        title: t("share.modal.file-link"),
        children: (
          <Stack align="stretch">
            <TextInput variant="filled" value={link} />
          </Stack>
        ),
      });
    }
  };
};

export default useCopyFileLink;
