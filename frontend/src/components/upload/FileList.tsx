import { useState, type ReactNode } from "react";
import { ActionIcon, Table, Group, UnstyledButton } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { TbTrash, TbEdit, TbChevronDown, TbChevronRight, TbFolder, TbFolderOpen } from "react-icons/tb";
import { GrUndo } from "react-icons/gr";
import { FileListItem } from "../../types/File.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import UploadProgressIndicator from "./UploadProgressIndicator";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { HoverTip } from "../core/HoverTip";
import showTextEditorModal from "./modals/showTextEditorModal";
import shareService from "../../services/share.service";

const renderFileName = (name: string) => {
  const parts = name.split("/");
  if (parts.length === 1) return name;
  const fileName = parts.pop();
  const folderPath = parts.join("/");
  return (
    <span>
      <span style={{ opacity: 0.5 }}>{folderPath}/</span>
      <span style={{ fontWeight: 600 }}>{fileName}</span>
    </span>
  );
};

const getFileNameOrPath = (file: FileListItem) => {
  const pathName =
    "webkitRelativePath" in file && file.webkitRelativePath
      ? file.webkitRelativePath
      : file.name;
  return pathName.replace(/\\/g, "/").replace(/^\//, "");
};

// Display-only tree. Original file objects and array indices are unchanged.
type TreeNode =
    | { type: "file"; index: number }
    | { type: "folder"; name: string; path: string; children: TreeNode[] };

const buildTree = (files: FileListItem[]): TreeNode[] => {
  const root: TreeNode[] = [];
  const folders = new Map<string, Extract<TreeNode, { type: "folder" }>>();

  files.forEach((file, index) => {
    const parts = getFileNameOrPath(file).split("/").filter(Boolean);
    let nodes = root;
    let path = "";

    for (const name of parts.slice(0, -1)) {
      path = path ? `${path}/${name}` : name;
      let folder = folders.get(path);
      if (!folder) {
        folder = { type: "folder", name, path, children: [] };
        nodes.push(folder);
        folders.set(path, folder);
      }
      nodes = folder.children;
    }

    nodes.push({ type: "file", index });
  });

  return root;
};

const FileListRow = ({
                       file,
                       depth = 0,
                       onRemove,
                       onRestore,
                       onEdit,
                     }: {
  file: FileListItem;
  depth?: number;
  onRemove?: () => void;
  onRestore?: () => void;
  onEdit?: () => void;
}) => {
  {
    const uploadable = "uploadingProgress" in file;
    const uploading = uploadable && file.uploadingProgress !== 0;
    const removable = uploadable
      ? file.uploadingProgress === 0
      : onRemove && !file.deleted;
    const restorable = onRestore && !uploadable && !!file.deleted;
    const deleted = !uploadable && !!file.deleted;

    const fileNameOrPath = getFileNameOrPath(file);
    const isTextFile = shareService.isShareTextFile(fileNameOrPath);
    const editable = isTextFile && uploadable && file.uploadingProgress === 0;

    const t = useTranslate();

    return (
        <tr
            style={{
              color: deleted ? "rgba(120, 120, 120, 0.5)" : "inherit",
              textDecoration: deleted ? "line-through" : "none",
            }}
        >
          <td style={{ paddingLeft: 56 + depth * 20 }}>
            {renderFileName(fileNameOrPath.split("/").pop() ?? fileNameOrPath)}
          </td>
          <td>{byteToHumanSizeString(+file.size)}</td>
          <td>
            <Group position="right" spacing="xs" noWrap>
              {editable && (
                  <HoverTip label={t("common.button.edit")}>
                    <ActionIcon
                        color="blue"
                        variant="light"
                        size={25}
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
                        size={25}
                        onClick={onRemove}
                    >
                      <TbTrash />
                    </ActionIcon>
                  </HoverTip>
              )}
              {uploading && (
                  <UploadProgressIndicator progress={file.uploadingProgress} />
              )}
              {restorable && (
                  <HoverTip label={t("common.button.undo")}>
                    <ActionIcon
                        color="victoria"
                        variant="light"
                        size={25}
                        onClick={onRestore}
                    >
                      <GrUndo />
                    </ActionIcon>
                  </HoverTip>
              )}
            </Group>
          </td>
        </tr>
    );
  }
};

const FileList = <T extends FileListItem = FileListItem>({
  files,
  setFiles,
}: {
  files: T[];
  setFiles: (files: T[]) => void;
}) => {
  const modals = useModals();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggleFolder = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const remove = (index: number) => {
    const file = files[index];

    if ("uploadingProgress" in file) {
      files.splice(index, 1);
    } else {
      files[index] = { ...file, deleted: true };
    }

    setFiles([...files]);
  };

  const restore = (index: number) => {
    const file = files[index];

    if ("uploadingProgress" in file) {
      return;
    } else {
      files[index] = { ...file, deleted: false };
    }

    setFiles([...files]);
  };

  const edit = async (index: number) => {
    const originalFile = files[index] as unknown as File;
    const text = await originalFile.text();

    showTextEditorModal(index, files, setFiles, text, modals);
  };
  const renderNodes = (nodes: TreeNode[], depth = 0): ReactNode[] =>
      nodes.flatMap((node) => {
        if (node.type === "file") {
          const i = node.index;
          return [
            <FileListRow
                key={i}
                file={files[i]}
                depth={depth}
                onRemove={() => remove(i)}
                onRestore={() => restore(i)}
                onEdit={() => edit(i)}
            />,
          ];
        }

        const open = !collapsed.has(node.path);
        return [
          <tr key={`folder-${node.path}`}>
            <td colSpan={3} style={{ paddingLeft: 16 + depth * 20 }}>
              <UnstyledButton
                  onClick={() => toggleFolder(node.path)}
                  aria-expanded={open}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}
              >
                {open ? <TbChevronDown /> : <TbChevronRight />}
                {open ? <TbFolderOpen /> : <TbFolder />}
                {node.name}
              </UnstyledButton>
            </td>
          </tr>,
          ...(open ? renderNodes(node.children, depth + 1) : []),
        ];
      });

  const rows = renderNodes(buildTree(files));
  return (
      <Table>
        <thead>
        <tr>
          <th>
            <FormattedMessage id="upload.filelist.name" />
          </th>
          <th>
            <FormattedMessage id="upload.filelist.size" />
          </th>
          <th></th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </Table>
  );
};

export default FileList;
