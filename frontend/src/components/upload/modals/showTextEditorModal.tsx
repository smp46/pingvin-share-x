import { ModalsContextProps } from "@mantine/modals/lib/context";
import mime from "mime-types";
import { FileListItem, FileUpload } from "../../../types/File.type";
import TextEditor from "../TextEditor";

const showTextEditorModal = <T extends FileListItem>(
  index: number,
  files: T[],
  setFiles: (files: T[]) => void,
  text: string,
  modals: ModalsContextProps,
) => {
  const originalFile = files[index] as unknown as File;
  const mimeType = (mime.contentType(originalFile.name) || "").split(";")[0];

  modals.openModal({
    title: `Editing ${originalFile.name}`,
    size: "xl",
    children: (
      <TextEditor
        initialText={text}
        onCancel={() => modals.closeAll()}
        onSave={(newText) => {
          const newFile = new File([newText], originalFile.name, {
            type: mimeType || "text/plain",
          });

          const fileUpload = newFile as FileUpload;
          fileUpload.uploadingProgress = 0;

          const updatedFiles = [...files];
          updatedFiles[index] = fileUpload as unknown as T;
          setFiles(updatedFiles);
          modals.closeAll();
        }}
      />
    ),
  });
};

export default showTextEditorModal;
