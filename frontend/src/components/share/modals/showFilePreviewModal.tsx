import { ModalsContextProps } from "@mantine/modals/lib/context";
import { FileMetaData } from "../../../types/File.type";
import { getMimeType } from "../../../utils/file.util";
import FilePreview from "../FilePreview";

const showFilePreviewModal = (
  shareId: string,
  file: FileMetaData,
  modals: ModalsContextProps,
) => {
  const mimeType = getMimeType(file.name);
  return modals.openModal({
    size: "xl",
    title: file.name,
    children: (
      <FilePreview shareId={shareId} fileId={file.id} mimeType={mimeType} />
    ),
  });
};

export default showFilePreviewModal;
