import { ActionIcon, Group, Skeleton } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { TbDownload, TbEye, TbLink, TbClipboard } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { FileMetaData } from "../../types/File.type";
import { Share } from "../../types/share.type";
import toast from "../../utils/toast.util";
import useCopyFileLink from "../../hooks/useCopyFileLink.hook";
import SortableHeader, { TableSort } from "../core/SortIcon";
import showFilePreviewModal from "./modals/showFilePreviewModal";
import { HoverTip } from "../core/HoverTip";
import api from "../../services/api.service";
import FileTree, { ICON_SIZE } from "../core/FileTree";

const getFilePath = (file: FileMetaData) => file.name;
const getFileSize = (file: FileMetaData) => parseInt(file.size);
const getFileKey = (file: FileMetaData) => file.id;

const FileList = ({
  files,
  share,
  isLoading,
  recipientId,
  sort,
  setSort,
  headerExtra,
}: {
  files?: FileMetaData[];
  share: Share;
  isLoading: boolean;
  recipientId?: string;
  sort: TableSort;
  setSort: Dispatch<SetStateAction<TableSort>>;
  headerExtra?: ReactNode;
}) => {
  const clipboard = useClipboard();
  const modals = useModals();
  const t = useTranslate();

  const copyFileLink = useCopyFileLink(share, recipientId);

  return (
    <FileTree
      files={files ?? []}
      getPath={getFilePath}
      getSize={getFileSize}
      getKey={getFileKey}
      sort={sort}
      headerExtra={headerExtra}
      loadingRows={isLoading ? skeletonRows : undefined}
      nameHeader={
        <SortableHeader sort={sort} setSort={setSort} property="name">
          <FormattedMessage id="share.table.name" />
        </SortableHeader>
      }
      sizeHeader={
        <SortableHeader sort={sort} setSort={setSort} property="size">
          <FormattedMessage id="share.table.size" />
        </SortableHeader>
      }
      renderFileActions={(file) => (
        <Group position="right" noWrap>
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
