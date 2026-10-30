import { ActionIcon, Group } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { CSSProperties, useMemo } from "react";
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

const getFileKey = (file: FileListItem) => ("id" in file ? file.id : undefined);

const getFileState = (file: FileListItem) => {
  if ("uploadingProgress" in file) {
    const pending = file.uploadingProgress === 0;
    return {
      uploadable: true,
      progress: file.uploadingProgress,
      removable: pending,
      editable:
        pending && shareService.isShareTextFile(getFileNameOrPath(file)),
      deleted: false,
    };
  }
  return {
    uploadable: false,
    progress: 0,
    removable: !file.deleted,
    editable: false,
    deleted: !!file.deleted,
  };
};

const folderProgress = (uploads: { progress: number; size: number }[]) => {
  if (uploads.some(({ progress }) => progress === -1)) return -1;

  const totalSize = uploads.reduce((total, { size }) => total + size, 0);
  if (totalSize === 0) {
    return (
      uploads.reduce(
        (total, { progress }) => total + Math.min(progress, 100),
        0,
      ) / uploads.length
    );
  }
  return (
    uploads.reduce(
      (total, { progress, size }) => total + Math.min(progress, 100) * size,
      0,
    ) / totalSize
  );
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
      {!!progress && <UploadProgressIndicator progress={progress} />}
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

  const states = useMemo(() => files.map(getFileState), [files]);

  const renderFileActions = (_file: T, index: number) => {
    const { editable, removable, deleted, progress } = states[index];

    return (
      <FileListActions
        editable={editable}
        removable={removable}
        restorable={deleted}
        progress={progress}
        onRemove={() => remove([index])}
        onRestore={() => restore([index])}
        onEdit={() => edit(index)}
      />
    );
  };

  const renderFolderActions = (folder: FolderNode) => {
    const live: number[] = [];
    const restorable: number[] = [];
    const uploads: { progress: number; size: number }[] = [];

    for (const { index, size } of folder.allFiles) {
      const state = states[index];
      if (state.deleted) restorable.push(index);
      else live.push(index);
      if (state.uploadable) uploads.push({ progress: state.progress, size });
    }

    const removable =
      live.length > 0 && live.every((index) => states[index].removable);

    return (
      <FileListActions
        removable={removable}
        restorable={restorable.length > 0}
        progress={uploads.length > 0 ? folderProgress(uploads) : undefined}
        onRemove={() => remove(live)}
        onRestore={() => restore(restorable)}
      />
    );
  };

  return (
    <FileTree
      files={files}
      getPath={getFileNameOrPath}
      getSize={getFileSize}
      getKey={getFileKey}
      nameHeader={<FormattedMessage id="upload.filelist.name" />}
      sizeHeader={<FormattedMessage id="upload.filelist.size" />}
      renderFileActions={renderFileActions}
      renderFolderActions={renderFolderActions}
      getFileStyle={(_file, index) =>
        states[index].deleted ? deletedStyle : undefined
      }
      getFolderStyle={(folder) =>
        folder.allFiles.every(({ index }) => states[index].deleted)
          ? deletedStyle
          : undefined
      }
    />
  );
};

export default FileList;
