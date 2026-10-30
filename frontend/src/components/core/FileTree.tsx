import {
  ActionIcon,
  Box,
  Group,
  Table,
  Text,
  MantineTheme,
  createStyles,
} from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";
import {
  CSSProperties,
  ReactNode,
  RefObject,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TbChevronDown,
  TbChevronRight,
  TbFolder,
  TbFolderOpen,
  TbFolders,
  TbFoldersOff,
} from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import { HoverTip } from "./HoverTip";
import { TableSort } from "./SortIcon";

export type FileTreeFile<T> = {
  item: T;
  index: number;
  name: string;
  path: string;
  size: number;
};

export type FolderNode<T> = {
  name: string;
  path: string;
  folders: FolderNode<T>[];
  files: FileTreeFile<T>[];
  allFiles: FileTreeFile<T>[];
  size: number;
};

const createFolder = <T,>(name: string, path: string): FolderNode<T> => ({
  name,
  path,
  folders: [],
  files: [],
  allFiles: [],
  size: 0,
});

const normalizePath = (raw: string) =>
  raw
    .replace(/\\/g, "/")
    .split("/")
    .reduce<string[]>((parts, segment) => {
      if (segment === "..") parts.pop();
      else if (segment && segment !== ".") parts.push(segment);
      return parts;
    }, []);

const compactFolder = <T,>(folder: FolderNode<T>): FolderNode<T> => {
  let node = folder;
  while (node.files.length === 0 && node.folders.length === 1) {
    const child = node.folders[0];
    node = { ...child, name: `${node.name}/${child.name}` };
  }
  return { ...node, folders: node.folders.map(compactFolder) };
};

const computeTotals = <T,>(folder: FolderNode<T>) => {
  folder.folders.forEach(computeTotals);
  folder.allFiles = [
    ...folder.files,
    ...folder.folders.flatMap((sub) => sub.allFiles),
  ];
  folder.size = folder.allFiles.reduce((total, file) => total + file.size, 0);
};

const buildFileTree = <T,>(
  items: T[],
  getPath: (item: T) => string,
  getSize: (item: T) => number,
): FolderNode<T> => {
  const root = createFolder<T>("", "");
  const foldersByPath = new Map<string, FolderNode<T>>([["", root]]);

  items.forEach((item, index) => {
    const rawPath = getPath(item);
    const parts = normalizePath(rawPath);
    const filePath = parts.join("/");
    const name = parts.pop() || rawPath.trim() || "—";

    let parent = root;
    for (const part of parts) {
      const path = parent.path ? `${parent.path}/${part}` : part;
      let folder = foldersByPath.get(path);
      if (!folder) {
        folder = createFolder<T>(part, path);
        foldersByPath.set(path, folder);
        parent.folders.push(folder);
      }
      parent = folder;
    }

    parent.files.push({
      item,
      index,
      name,
      path: filePath,
      size: getSize(item),
    });
  });

  computeTotals(root);
  return { ...root, folders: root.folders.map(compactFolder) };
};

const sortFileTree = <T,>(
  folder: FolderNode<T>,
  sort?: TableSort,
): FolderNode<T> => {
  if (!sort?.property) return folder;

  const factor = sort.direction === "asc" ? 1 : -1;
  const compare = (
    a: { name: string; size: number },
    b: { name: string; size: number },
  ) =>
    factor *
    (sort.property === "size"
      ? a.size - b.size
      : a.name.localeCompare(b.name, undefined, { numeric: true }));

  return {
    ...folder,
    folders: folder.folders.map((sub) => sortFileTree(sub, sort)).sort(compare),
    files: [...folder.files].sort(compare),
  };
};

const getFolderPaths = <T,>(folder: FolderNode<T>): string[] =>
  folder.folders.flatMap((sub) => [sub.path, ...getFolderPaths(sub)]);

export const ICON_SIZE = 25;

const indent = (theme: MantineTheme) =>
  `calc(${ICON_SIZE}px + ${theme.spacing.xs})`;

const nameCellStyle = (theme: MantineTheme, depth: number): CSSProperties => ({
  ...(depth > 0 && {
    position: "relative",
    paddingInlineStart: `calc(${theme.spacing.xs} + ${depth} * ${indent(theme)})`,
  }),
});

const useStyles = createStyles((theme) => ({
  connector: {
    position: "absolute",
    pointerEvents: "none",
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
    borderStyle: "solid",
    borderWidth: 0,
    borderInlineStartWidth: 1,
  },
  folderRow: {
    cursor: "pointer",
    ...theme.fn.hover({
      backgroundColor: theme.fn.rgba(theme.fn.primaryColor(), 0.08),
    }),
  },
  folderIcon: {
    color: theme.fn.primaryColor(),
    flexShrink: 0,
  },
  collapsedChevron: {
    "[dir='rtl'] &": {
      transform: "scaleX(-1)",
    },
  },
}));

type Connectors = {
  trail: boolean[];
  isLast: boolean;
};

const TreeConnectors = ({ trail, isLast }: Connectors) => {
  const { classes, theme } = useStyles();
  const offset = (level: number) =>
    `calc(${theme.spacing.xs} + ${ICON_SIZE / 2}px + ${level} * ${indent(theme)})`;
  const level = trail.length;

  return (
    <>
      {trail.map(
        (continues, ancestor) =>
          continues && (
            <span
              key={ancestor}
              aria-hidden
              className={classes.connector}
              style={{ insetInlineStart: offset(ancestor), top: -1, bottom: 0 }}
            />
          ),
      )}
      <span
        aria-hidden
        className={classes.connector}
        style={{
          insetInlineStart: offset(level),
          top: -1,
          height: "calc(50% + 1px)",
          width: `calc(${indent(theme)} - ${ICON_SIZE / 2 + 6}px)`,
          borderBottomWidth: 1,
          borderEndStartRadius: theme.radius.sm,
        }}
      />
      {!isLast && (
        <span
          aria-hidden
          className={classes.connector}
          style={{ insetInlineStart: offset(level), top: "50%", bottom: 0 }}
        />
      )}
    </>
  );
};

const useFolderExpansion = (
  folderPaths: string[],
  tableRef: RefObject<HTMLTableElement>,
) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const decided = useRef(new Set<string>());
  const pending = folderPaths.filter((path) => !decided.current.has(path));

  useIsomorphicEffect(() => {
    if (pending.length === 0) return;

    const tableBottom = tableRef.current?.getBoundingClientRect().bottom ?? 0;
    const fits = tableBottom + window.scrollY <= window.innerHeight;

    pending.forEach((path) => decided.current.add(path));
    setExpanded((prev) => {
      const next = new Set(prev);
      pending.forEach((path) => (fits ? next.add(path) : next.delete(path)));
      return next;
    });
  });

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  return {
    isExpanded: (path: string) => expanded.has(path) || pending.includes(path),
    toggle,
    expandAll: () => setExpanded(new Set(folderPaths)),
    collapseAll: () => setExpanded(new Set()),
  };
};

const FolderRow = ({
  folder,
  depth,
  connectors,
  expanded,
  onToggle,
  actions,
  style,
}: {
  folder: FolderNode<unknown>;
  depth: number;
  connectors?: Connectors;
  expanded: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  style?: CSSProperties;
}) => {
  const { classes, theme } = useStyles();
  const t = useTranslate();
  const FolderIcon = expanded ? TbFolderOpen : TbFolder;

  return (
    <tr
      aria-expanded={expanded}
      className={classes.folderRow}
      style={style}
      onClick={onToggle}
      data-folder-path={folder.path}
    >
      <td style={nameCellStyle(theme, depth)}>
        {connectors && <TreeConnectors {...connectors} />}
        <Group spacing={6} noWrap>
          <ActionIcon
            color={theme.primaryColor}
            variant="subtle"
            size={ICON_SIZE}
            aria-label={t(
              expanded ? "filelist.collapse-folder" : "filelist.expand-folder",
            )}
          >
            {expanded ? (
              <TbChevronDown />
            ) : (
              <TbChevronRight className={classes.collapsedChevron} />
            )}
          </ActionIcon>
          <FolderIcon size={18} className={classes.folderIcon} />
          <span style={{ fontWeight: 600 }}>{folder.name}</span>
          <Text
            component="span"
            size="xs"
            color="dimmed"
            sx={{ flexShrink: 0 }}
          >
            <FormattedMessage
              id="filelist.folder.file-count"
              values={{ count: folder.allFiles.length }}
            />
          </Text>
        </Group>
      </td>
      <td>{byteToHumanSizeString(folder.size)}</td>
      <td onClick={(e) => e.stopPropagation()}>{actions}</td>
    </tr>
  );
};

const FileRow = ({
  file,
  depth,
  connectors,
  actions,
  style,
}: {
  file: FileTreeFile<unknown>;
  depth: number;
  connectors?: Connectors;
  actions: ReactNode;
  style?: CSSProperties;
}) => {
  const { theme } = useStyles();

  return (
    <tr style={style} data-file-path={file.path}>
      <td style={nameCellStyle(theme, depth)}>
        {connectors && <TreeConnectors {...connectors} />}
        {file.name}
      </td>
      <td>{byteToHumanSizeString(file.size)}</td>
      <td>{actions}</td>
    </tr>
  );
};

const FileTree = <T extends object>({
  files,
  getPath,
  getSize,
  getKey,
  sort,
  nameHeader,
  sizeHeader,
  loadingRows,
  renderFileActions,
  renderFolderActions,
  getFileStyle,
  getFolderStyle,
}: {
  files: T[];
  getPath: (item: T) => string;
  getSize: (item: T) => number;
  getKey?: (item: T) => string | undefined;
  sort?: TableSort;
  nameHeader: ReactNode;
  sizeHeader: ReactNode;
  loadingRows?: ReactNode;
  renderFileActions: (item: T, index: number) => ReactNode;
  renderFolderActions?: (folder: FolderNode<T>) => ReactNode;
  getFileStyle?: (item: T, index: number) => CSSProperties | undefined;
  getFolderStyle?: (folder: FolderNode<T>) => CSSProperties | undefined;
}) => {
  const { theme } = useStyles();
  const t = useTranslate();
  const tableRef = useRef<HTMLTableElement>(null);
  const itemIds = useRef(new WeakMap<T, number>());
  const nextItemId = useRef(0);

  const tree = useMemo(
    () => buildFileTree(files, getPath, getSize),
    [files, getPath, getSize],
  );
  const sortedTree = useMemo(() => sortFileTree(tree, sort), [tree, sort]);
  const folderPaths = useMemo(() => getFolderPaths(tree), [tree]);
  const { isExpanded, toggle, expandAll, collapseAll } = useFolderExpansion(
    folderPaths,
    tableRef,
  );

  const keyOf = (item: T) => {
    const key = getKey?.(item);
    if (key !== undefined) return key;
    let id = itemIds.current.get(item);
    if (id === undefined) {
      id = nextItemId.current++;
      itemIds.current.set(item, id);
    }
    return `item:${id}`;
  };

  const headerActions = [
    {
      label: "filelist.expand-all",
      Icon: TbFolders,
      onClick: expandAll,
    },
    {
      label: "filelist.collapse-all",
      Icon: TbFoldersOff,
      onClick: collapseAll,
    },
  ];

  const renderRows = (
    folder: FolderNode<T>,
    depth: number,
    trail: boolean[],
  ): ReactNode[] => {
    const lastIndex = folder.folders.length + folder.files.length - 1;
    const connectorsAt = (i: number) =>
      depth > 0 ? { trail, isLast: i === lastIndex } : undefined;

    return [
      ...folder.folders.flatMap((sub, i) => {
        const expanded = isExpanded(sub.path);
        const connectors = connectorsAt(i);
        return [
          <FolderRow
            key={`folder:${sub.path}`}
            folder={sub}
            depth={depth}
            connectors={connectors}
            expanded={expanded}
            onToggle={() => toggle(sub.path)}
            actions={renderFolderActions?.(sub)}
            style={getFolderStyle?.(sub)}
          />,
          ...(expanded
            ? renderRows(
                sub,
                depth + 1,
                connectors ? [...trail, !connectors.isLast] : [],
              )
            : []),
        ];
      }),
      ...folder.files.map((file, i) => {
        const item = file.item;
        const index = folder.folders.length + i;
        return (
          <FileRow
            key={`file:${keyOf(item)}`}
            file={file}
            depth={depth}
            connectors={connectorsAt(index)}
            actions={renderFileActions(item, file.index)}
            style={getFileStyle?.(item, file.index)}
          />
        );
      }),
    ];
  };

  return (
    <Box sx={{ display: "block", overflowX: "auto" }}>
      <Table ref={tableRef}>
        <thead>
          <tr>
            <th>
              <Group spacing="xs" noWrap>
                {nameHeader}
                {folderPaths.length > 0 && (
                  <Group spacing={4} noWrap>
                    {headerActions.map(({ label, Icon, onClick }) => (
                      <HoverTip key={label} label={t(label)}>
                        <ActionIcon
                          color={theme.primaryColor}
                          variant="subtle"
                          size={ICON_SIZE}
                          aria-label={t(label)}
                          onClick={onClick}
                        >
                          <Icon />
                        </ActionIcon>
                      </HoverTip>
                    ))}
                  </Group>
                )}
              </Group>
            </th>
            <th>{sizeHeader}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{loadingRows ?? renderRows(sortedTree, 0, [])}</tbody>
      </Table>
    </Box>
  );
};

export default FileTree;
