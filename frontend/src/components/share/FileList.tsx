import { ActionIcon, Group, Skeleton, Stack, TextInput } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import { useState } from "react";
import { TbDownload, TbEye, TbLink, TbClipboard } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { FileMetaData } from "../../types/File.type";
import { Share } from "../../types/share.type";
import toast from "../../utils/toast.util";
import TableSortIcon, { TableSort } from "../core/SortIcon";
import showFilePreviewModal from "./modals/showFilePreviewModal";
import { HoverTip } from "../core/HoverTip";
import api from "../../services/api.service";
import FileTree, { ICON_SIZE } from "../core/FileTree";

const getFilePath = (file: FileMetaData) => file.name;
const getFileSize = (file: FileMetaData) => parseInt(file.size);

const FileList = ({
  files,
  share,
  isLoading,
  recipientId,
}: {
  files?: FileMetaData[];
  share: Share;
  isLoading: boolean;
  recipientId?: string;
}) => {
  const clipboard = useClipboard();
  const config = useConfig();
  const modals = useModals();
  const t = useTranslate();

  const [sort, setSort] = useState<TableSort>({
    property: "name",
    direction: "asc",
  });

  const copyFileLink = (file: FileMetaData) => {
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

  return (
    <FileTree
      files={files ?? []}
      getPath={getFilePath}
      getSize={getFileSize}
      sort={sort}
      loadingRows={isLoading ? skeletonRows : undefined}
      nameHeader={
        <Group spacing="xs">
          <FormattedMessage id="share.table.name" />
          <TableSortIcon sort={sort} setSort={setSort} property="name" />
        </Group>
      }
      sizeHeader={
        <Group spacing="xs">
          <FormattedMessage id="share.table.size" />
          <TableSortIcon sort={sort} setSort={setSort} property="size" />
        </Group>
      }
      renderFileActions={(file) => (
        <Group position="right" noWrap>
          {shareService.isShareTextFile(file.name) && (
            <HoverTip label={t("share.copy-text-contents")}>
              <ActionIcon
                color="blue"
                variant="light"
                size={ICON_SIZE}
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
            <HoverTip label={t("common.button.preview")}>
              <ActionIcon
                color="green"
                variant="light"
                size={ICON_SIZE}
                onClick={() => showFilePreviewModal(share.id, file, modals)}
              >
                <TbEye />
              </ActionIcon>
            </HoverTip>
          )}
          {!share.hasPassword && (
            <HoverTip label={t("common.button.copy-link")}>
              <ActionIcon
                color="victoria"
                variant="light"
                size={ICON_SIZE}
                onClick={() => copyFileLink(file)}
              >
                <TbLink />
              </ActionIcon>
            </HoverTip>
          )}

          <HoverTip label={t("common.button.download")}>
            <ActionIcon
              color="cyan"
              variant="light"
              size={ICON_SIZE}
              onClick={async () => {
                await shareService.downloadFile(share.id, file.id, recipientId);
              }}
            >
              <TbDownload />
            </ActionIcon>
          </HoverTip>
        </Group>
      )}
    />
  );
};

const skeletonRows = [...Array(5)].map((c, i) => (
  <tr key={i}>
    <td>
      <Skeleton height={30} width={30} />
    </td>
    <td>
      <Skeleton height={14} />
    </td>
    <td>
      <Skeleton height={14} />
    </td>
    <td>
      <Skeleton height={25} width={25} />
    </td>
  </tr>
));

export default FileList;
