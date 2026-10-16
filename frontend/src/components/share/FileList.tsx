import {
  ActionIcon,
  Button,
  Checkbox,
  Box,
  Group,
  Skeleton,
  Stack,
  Table,
  TextInput,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  TbDownload,
  TbEye,
  TbLink,
  TbClipboard,
  TbChevronDown,
  TbChevronRight,
  TbFolder,
  TbFolderOpen,
} from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { FileMetaData } from "../../types/File.type";
import { Share } from "../../types/share.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import toast from "../../utils/toast.util";
import TableSortIcon, { TableSort } from "../core/SortIcon";
import showFilePreviewModal from "./modals/showFilePreviewModal";
import { HoverTip } from "../core/HoverTip";
import api from "../../services/api.service";

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
// Build folder rows from the existing relative file names; no backend changes.
type TreeNode =
    | { kind: "folder"; name: string; path: string; children: TreeNode[] }
    | { kind: "file"; name: string; file: FileMetaData };

const buildTreeRows = (files: FileMetaData[], collapsed: string[]) => {
  const root: TreeNode[] = [];
  const folders = new Map<string, Extract<TreeNode, { kind: "folder" }>>();

  files.forEach((file) => {
    const parts = file.name.replace(/\\/g, "/").split("/");
    let children = root;
    let path = "";

    parts.slice(0, -1).forEach((name) => {
      path = path ? `${path}/${name}` : name;
      let folder = folders.get(path);
      if (!folder) {
        folder = { kind: "folder", name, path, children: [] };
        folders.set(path, folder);
        children.push(folder);
      }
      children = folder.children;
    });

    children.push({ kind: "file", name: parts[parts.length - 1], file });
  });

  const rows: { node: TreeNode; depth: number }[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    nodes.forEach((node) => {
      rows.push({ node, depth });
      if (node.kind === "folder" && !collapsed.includes(node.path)) {
        walk(node.children, depth + 1);
      }
    });
  };
  walk(root, 0);
  return rows;
};

const FileList = ({
  files,
  setShare,
  share,
  isLoading,
  recipientId,
}: {
  files?: FileMetaData[];
  setShare: Dispatch<SetStateAction<Share | undefined>>;
  share: Share;
  isLoading: boolean;
  recipientId?: string;
}) => {
  const clipboard = useClipboard();
  const config = useConfig();
  const modals = useModals();
  const t = useTranslate();
  const [collapsedFolders, setCollapsedFolders] = useState<string[]>([]);
  const toggleFolder = (path: string) => {
    setCollapsedFolders((current) =>
        current.includes(path)
            ? current.filter((folder) => folder !== path)
            : [...current, path],
    );
  };
  const treeRows = buildTreeRows(files ?? [], collapsedFolders);

  // Selection is based on file IDs, so collapsed folders do not affect it.
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const currentFiles = files ?? [];
  const currentFileIds = currentFiles.map((file) => file.id);
  const selectedSet = new Set(selectedFileIds);
  const selectedCurrentIds = currentFileIds.filter((id) => selectedSet.has(id));
  const allSelected = currentFileIds.length > 0 && selectedCurrentIds.length === currentFileIds.length;

  const selectFiles = (ids: string[], checked: boolean) => {
    setSelectedFileIds((previous) => {
      const next = new Set(previous);
      for (const id of ids) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return [...next];
    });
  };

  const folderFileIds = (path: string) =>
      currentFiles
          .filter((file) => file.name.replace(/\\/g, "/").startsWith(`${path}/`))
          .map((file) => file.id);

  const downloadSelected = () => {
    if (selectedCurrentIds.length === 0) return;
    // Native form submission streams the ZIP to the browser, avoiding a huge Blob in JS memory.
    const form = document.createElement("form");
    form.method = "POST";
    const recipientQuery = recipientId
        ? `?recipient=${encodeURIComponent(recipientId)}`
        : "";
    form.action = `/api/shares/${encodeURIComponent(share.id)}/files/selected-zip${recipientQuery}`;
    form.style.display = "none";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "fileIds";
    input.value = JSON.stringify(selectedCurrentIds);
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  };


  const [sort, setSort] = useState<TableSort>({
    property: "name",
    direction: "desc",
  });

  const sortFiles = () => {
    if (files && sort.property) {
      const sortedFiles = files.sort((a: any, b: any) => {
        if (sort.direction === "asc") {
          return b[sort.property!].localeCompare(a[sort.property!], undefined, {
            numeric: true,
          });
        } else {
          return a[sort.property!].localeCompare(b[sort.property!], undefined, {
            numeric: true,
          });
        }
      });

      setShare({
        ...share,
        files: sortedFiles,
      });
    }
  };

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

  useEffect(sortFiles, [sort]);

  return (
      <Box sx={{ display: "block", overflowX: "auto" }}>
        <Group position="right" mb="sm" spacing="sm">
          <Button
              leftIcon={<TbDownload />}
              disabled={isLoading || selectedCurrentIds.length === 0}
              onClick={downloadSelected}
          >
            Скачать выбранное ({selectedCurrentIds.length})
          </Button>
        </Group>
        <Table>
          <thead>
          <tr>
            <th>
              <Group spacing="xs">
                <Checkbox
                    size="xs"
                    aria-label="Выбрать все файлы"
                    checked={allSelected}
                    indeterminate={selectedCurrentIds.length > 0 && !allSelected}
                    onChange={(event) => selectFiles(currentFileIds, event.currentTarget.checked)}
                />
                <FormattedMessage id="share.table.name" />
                <TableSortIcon sort={sort} setSort={setSort} property="name" />
              </Group>
            </th>
            <th>
              <Group spacing="xs">
                <FormattedMessage id="share.table.size" />
                <TableSortIcon sort={sort} setSort={setSort} property="size" />
              </Group>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {isLoading
              ? skeletonRows
              : treeRows.map(({ node, depth }) => {
                if (node.kind === "folder") {
                  const closed = collapsedFolders.includes(node.path);
                  const folderIds = folderFileIds(node.path);
                  return (
                      <tr key={`folder:${node.path}`}>
                        <td style={{ paddingLeft: 12 + depth * 22 }}>
                          <Group spacing="xs" noWrap>
                            <Checkbox
                                size="xs"
                                aria-label={`Выбрать папку ${node.name}`}
                                checked={folderIds.length > 0 && folderIds.every((id) => selectedSet.has(id))}
                                indeterminate={folderIds.some((id) => selectedSet.has(id)) && !folderIds.every((id) => selectedSet.has(id))}
                                onChange={(event) => selectFiles(folderIds, event.currentTarget.checked)}
                            />
                            <button
                                type="button"
                                onClick={() => toggleFolder(node.path)}
                                aria-expanded={!closed}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  paddingLeft: 0,
                                  background: "none",
                                  border: "none",
                                  color: "inherit",
                                  font: "inherit",
                                  cursor: "pointer",
                                }}
                            >
                              {closed ? <TbChevronRight /> : <TbChevronDown />}
                              {closed ? <TbFolder /> : <TbFolderOpen />}
                              <span style={{ fontWeight: 600 }}>{node.name}</span>
                            </button>
                          </Group>
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                  );
                }
                const file = node.file;
                return (
                    <tr key={file.id}>
                      <td style={{ paddingLeft: 12 + depth * 22 }}>
                        <Group spacing="xs" noWrap>
                          <Checkbox
                              size="xs"
                              aria-label={`Выбрать файл ${node.name}`}
                              checked={selectedSet.has(file.id)}
                              onChange={(event) => selectFiles([file.id], event.currentTarget.checked)}
                          />
                          {renderFileName(node.name)}
                        </Group>
                      </td>
                      <td>{byteToHumanSizeString(parseInt(file.size))}</td>
                      <td>
                        <Group position="right" noWrap>
                          {shareService.isShareTextFile(file.name) && (
                              <HoverTip label={t("share.copy-text-contents")}>
                                <ActionIcon
                                    color="blue"
                                    variant="light"
                                    size={25}
                                    onClick={() => {
                                      api
                                          .get(
                                              `/shares/${share.id}/files/${file.id}?download=false`,
                                          )
                                          .then((res) => {
                                            if (window.isSecureContext) {
                                              clipboard.copy(res.data);
                                              toast.success(
                                                  t("share.notify.copied-contents"),
                                              );
                                            } else {
                                              toast.error(
                                                  t("share.notify.copy-not-supported"),
                                              );
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
                                    size={25}
                                    onClick={() =>
                                        showFilePreviewModal(share.id, file, modals)
                                    }
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
                                    size={25}
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
                                size={25}
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
                      </td>
                    </tr>
                );
              })}
          </tbody>
        </Table>
      </Box>
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
