import {
  ActionIcon,
  Box,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Text,
} from "@mantine/core";
import { useModals } from "@mantine/modals";
import { TbDownload, TbFile, TbLink } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { FileMetaData } from "../../types/File.type";
import { Share } from "../../types/share.type";
import { getMimeType } from "../../utils/file.util";
import useCopyFileLink from "../../hooks/useCopyFileLink.hook";
import { HoverTip } from "../core/HoverTip";
import { ICON_SIZE } from "../core/FileTree";
import showFilePreviewModal from "./modals/showFilePreviewModal";

const FilePreviewBox = ({
  shareId,
  file,
}: {
  shareId: string;
  file: FileMetaData;
}) => {
  const mimeType = getMimeType(file.name);
  const src = `/api/shares/${shareId}/files/${file.id}?download=false`;
  const style = { width: "100%", height: "100%", objectFit: "cover" as const };

  if (mimeType.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={file.name} style={style} loading="lazy" />;
  }
  if (mimeType.startsWith("video/")) {
    return <video src={src} style={style} preload="metadata" muted />;
  }
  return (
    <Center style={{ height: "100%" }}>
      <TbFile size={48} />
    </Center>
  );
};

const FileGallery = ({
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
  const modals = useModals();
  const t = useTranslate();

  const copyFileLink = useCopyFileLink(share, recipientId);

  return (
    <SimpleGrid
      cols={4}
      breakpoints={[
        { maxWidth: "md", cols: 3 },
        { maxWidth: "sm", cols: 2 },
        { maxWidth: "xs", cols: 1 },
      ]}
    >
      {isLoading
        ? [...Array(4)].map((_, i) => (
            <Skeleton key={i} style={{ aspectRatio: "1 / 1" }} />
          ))
        : (files ?? []).map((file) => (
            <Paper key={file.id} withBorder style={{ overflow: "hidden" }}>
              <Box
                style={{
                  aspectRatio: "1 / 1",
                  cursor: shareService.doesFileSupportPreview(file.name)
                    ? "pointer"
                    : undefined,
                }}
                onClick={() =>
                  shareService.doesFileSupportPreview(file.name) &&
                  showFilePreviewModal(share.id, file, modals)
                }
              >
                <FilePreviewBox shareId={share.id} file={file} />
              </Box>
              <Group position="apart" noWrap p="xs">
                <Text size="sm" truncate title={file.name}>
                  {file.name}
                </Text>
                <Group spacing="xs" noWrap>
                  {!share.hasPassword && (
                    <HoverTip
                      label={t("common.button.copy-link")}
                      touch={false}
                    >
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
                        await shareService.downloadFile(
                          share.id,
                          file.id,
                          recipientId,
                        );
                      }}
                    >
                      <TbDownload />
                    </ActionIcon>
                  </HoverTip>
                </Group>
              </Group>
            </Paper>
          ))}
    </SimpleGrid>
  );
};

export default FileGallery;
