import { ActionIcon, Group } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { CSSProperties } from "react";
import { TbTrash, TbEdit } from "react-icons/tb";
import { GrUndo } from "react-icons/gr";
import { FileListItem } from "../../types/File.type";
import UploadProgressIndicator from "./UploadProgressIndicator";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { HoverTip } from "../core/HoverTip";
import FileTree, { FolderNode, ICON_SIZE } from "../core/FileTree";
import showTextEditorModal from "./modals/showTextEditorModal";
import shareService from "../../services/share.service";

const getFileNameOrPath = (file: FileListItem) => {
  const pathName =
    "webkitRelativePath" in file && file.webkitRelativePath
      ? file.webkitRelativePath
      : file.name;
  return pathName;
};

const getFileSize = (file: FileListItem) => +file.size;

const getFileState = (file: FileListItem) => {
  const uploadable = "uploadingProgress" in file;
  return {
    uploadable,
    progress: uploadable ? file.uploadingProgress : 0,
    uploading: uploadable && file.uploadingProgress !== 0,
    removable: uploadable ? file.uploadingProgress === 0 : !file.deleted,
    restorable: !uploadable && !!file.deleted,
    deleted: !uploadable && !!file.deleted,
  };
};

const deletedStyle: CSSProperties = {
  color: "rgba(120, 120, 120, 0.5)",
  textDecoration: "line-through",
};

const FileListActions = ({
  editable,
  removable,
  restorable,
  progress,
  onRemove,
  onRestore,
  onEdit,
}: {
  editable?: boolean;
  removable?: boolean;
  restorable?: boolean;
  progress?: number;
  onRemove?: () => void;
  onRestore?: () => void;
  onEdit?: () => void;
}) => {
  const t = useTranslate();

  return (
    <Group position="right" spacing="xs" noWrap>
      {editable && (
        <HoverTip label={t("common.button.edit")}>
          <ActionIcon
            color="blue"
            variant="light"
            size={ICON_SIZE}
            onClick={onEdit}
          >
            <TbEdit />
          </ActionIcon>
        </HoverTip>
      )}
      {removable && (
        <HoverTip label={t("common.button.delete")}>
          <ActionIcon
            color="red"
            variant="light"
            size={ICON_SIZE}
            onClick={onRemove}
          >
            <TbTrash />
          </ActionIcon>
        </HoverTip>
      )}
      {progress !== undefined && (
        <UploadProgressIndicator progress={progress} />
      )}
      {restorable && (
        <HoverTip label={t("common.button.undo")}>
          <ActionIcon
            color="victoria"
            variant="light"
            size={ICON_SIZE}
            onClick={onRestore}
          >
            <GrUndo />
          </ActionIcon>
        </HoverTip>
      )}
    </Group>
  );
};

const FileList = <T extends FileListItem = FileListItem>({
  files,
  setFiles,
}: {
  files: T[];
  setFiles: (files: T[]) => void;
}) => {
  const modals = useModals();

  const remove = (indices: number[]) => {
    for (const index of [...indices].sort((a, b) => b - a)) {
      const file = files[index];

      if ("uploadingProgress" in file) {
        files.splice(index, 1);
      } else {
        files[index] = { ...file, deleted: true };
      }
    }

    setFiles([...files]);
  };

  const restore = (indices: number[]) => {
    for (const index of indices) {
      const file = files[index];

      if (!("uploadingProgress" in file)) {
        files[index] = { ...file, deleted: false };
      }
    }

    setFiles([...files]);
  };

  const edit = async (index: number) => {
    const originalFile = files[index] as unknown as File;
    const text = await originalFile.text();

    showTextEditorModal(index, files, setFiles, text, modals);
  };

  const renderFileActions = (file: T, index: number) => {
    const { uploadable, progress, uploading, removable, restorable } =
      getFileState(file);
    const editable =
      uploadable &&
      progress === 0 &&
      shareService.isShareTextFile(getFileNameOrPath(file));

    return (
      <FileListActions
        editable={editable}
        removable={removable}
        restorable={restorable}
        progress={uploading ? progress : undefined}
        onRemove={() => remove([index])}
        onRestore={() => restore([index])}
        onEdit={() => edit(index)}
      />
    );
  };

  const renderFolderActions = (folder: FolderNode<T>) => {
    const folderFiles = folder.allFiles.map((file) => ({
      ...file,
      state: getFileState(file.item),
    }));
    const removable = folderFiles.filter((file) => file.state.removable);
    const restorable = folderFiles.filter((file) => file.state.restorable);
    const uploads = folderFiles.filter((file) => file.state.uploadable);
    const uploading = folderFiles.some((file) => file.state.uploading);

    return (
      <FileListActions
        removable={removable.length > 0}
        restorable={restorable.length > 0}
        progress={
          uploading
            ? uploads.reduce(
                (total, file) =>
                  total + Math.min(Math.max(file.state.progress, 0), 100),
                0,
              ) / uploads.length
            : undefined
        }
        onRemove={() => remove(removable.map((file) => file.index))}
        onRestore={() => restore(restorable.map((file) => file.index))}
      />
    );
  };

  return (
    <FileTree
      files={files}
      getPath={getFileNameOrPath}
      getSize={getFileSize}
      nameHeader={<FormattedMessage id="upload.filelist.name" />}
      sizeHeader={<FormattedMessage id="upload.filelist.size" />}
      renderFileActions={renderFileActions}
      renderFolderActions={renderFolderActions}
      getFileStyle={(file) =>
        getFileState(file).deleted ? deletedStyle : undefined
      }
      getFolderStyle={(folder) =>
        folder.allFiles.every((file) => getFileState(file.item).deleted)
          ? deletedStyle
          : undefined
      }
    />
  );
};

export default FileList;
