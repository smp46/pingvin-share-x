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
  TbArrowsVertical,
  TbChevronDown,
  TbChevronRight,
  TbFold,
  TbFolder,
  TbFolderOpen,
} from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import { HoverTip } from "./HoverTip";
import { TableSort } from "./SortIcon";

export type FileTreeFile = {
  index: number;
  name: string;
  path: string;
  size: number;
};

export type FolderNode = {
  name: string;
  path: string;
  folders: FolderNode[];
  files: FileTreeFile[];
  allFiles: FileTreeFile[];
  size: number;
};

const createFolder = (name: string, path: string): FolderNode => ({
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

const compactFolder = (folder: FolderNode): FolderNode => {
  let node = folder;
  while (node.files.length === 0 && node.folders.length === 1) {
    const child = node.folders[0];
    node = { ...child, name: `${node.name}/${child.name}` };
  }
  return { ...node, folders: node.folders.map(compactFolder) };
};

const computeTotals = (folder: FolderNode) => {
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
): FolderNode => {
  const root = createFolder("", "");
  const foldersByPath = new Map<string, FolderNode>([["", root]]);

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
        folder = createFolder(part, path);
        foldersByPath.set(path, folder);
        parent.folders.push(folder);
      }
      parent = folder;
    }

    parent.files.push({ index, name, path: filePath, size: getSize(item) });
  });

  computeTotals(root);
  return { ...root, folders: root.folders.map(compactFolder) };
};

const sortFileTree = (folder: FolderNode, sort?: TableSort): FolderNode => {
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

const getFolderPaths = (folder: FolderNode): string[] =>
  folder.folders.flatMap((sub) => [sub.path, ...getFolderPaths(sub)]);

const getMaxDepth = (folder: FolderNode): number =>
  Math.max(0, ...folder.folders.map((sub) => 1 + getMaxDepth(sub)));

const countVisibleRows = (
  folder: FolderNode,
  isOpen: (path: string) => boolean,
): number =>
  folder.files.length +
  folder.folders.reduce(
    (total, sub) =>
      total + 1 + (isOpen(sub.path) ? countVisibleRows(sub, isOpen) : 0),
    0,
  );

export const ICON_SIZE = 25;

const nameCellStyle = (theme: MantineTheme, depth: number): CSSProperties => ({
  overflowWrap: "anywhere",
  ...(depth > 0 && {
    position: "relative",
    paddingInlineStart: `calc(${theme.spacing.xs} + ${depth} * var(--tree-indent))`,
  }),
});

const useStyles = createStyles((theme) => ({
  tree: {
    "--tree-indent": `calc(${ICON_SIZE}px + ${theme.spacing.xs})`,
    "--tree-guide": `${ICON_SIZE / 2}px`,
    "--tree-gap": "6px",
    [theme.fn.smallerThan("xs")]: {
      "--tree-indent": "min(12px, calc(60px / var(--tree-depth)))",
      "--tree-guide": "calc(var(--tree-indent) / 2)",
      "--tree-gap": "2px",
    },
  },
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
    [theme.fn.smallerThan("xs")]: {
      display: "none",
    },
  },
  folderLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    [theme.fn.smallerThan("xs")]: {
      display: "block",
    },
  },
  fileCount: {
    flexShrink: 0,
    [theme.fn.smallerThan("xs")]: {
      marginInlineStart: 6,
    },
  },
  collapsedChevron: {
    "[dir='rtl'] &": {
      transform: "scaleX(-1)",
    },
  },
  headerCell: {
    whiteSpace: "nowrap",
  },
  headerActions: {
    [theme.fn.smallerThan("xs")]: {
      gap: 2,
    },
  },
  headerActionIcon: {
    [theme.fn.smallerThan("xs")]: {
      width: 22,
      height: 22,
      minWidth: 22,
      minHeight: 22,
    },
  },
}));

type Connectors = {
  trail: boolean[];
  isLast: boolean;
};

type RowPosition = {
  depth: number;
  index: number;
  setSize: number;
};

const rowAria = ({ depth, index, setSize }: RowPosition) => ({
  role: "row",
  "aria-level": depth + 1,
  "aria-posinset": index + 1,
  "aria-setsize": setSize,
});

const ariaSort = (sort: TableSort | undefined, property: string) =>
  sort?.property === property
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : undefined;

const TreeConnectors = ({ trail, isLast }: Connectors) => {
  const { classes, theme } = useStyles();
  const offset = (level: number) =>
    `calc(${theme.spacing.xs} + var(--tree-guide) + ${level} * var(--tree-indent))`;
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
          width:
            "max(0px, calc(var(--tree-indent) - var(--tree-guide) - var(--tree-gap)))",
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
  tree: FolderNode,
  folderPaths: string[],
  tableRef: RefObject<HTMLTableElement>,
  enabled: boolean,
) => {
  const [state, setState] = useState({
    expanded: new Set<string>(),
    decided: new Set<string>(),
  });

  useIsomorphicEffect(() => {
    if (!enabled) return;
    const pending = new Set(
      folderPaths.filter((path) => !state.decided.has(path)),
    );
    if (pending.size === 0) return;

    let fits = true;
    const table = tableRef.current;
    const body = table?.tBodies[0];
    if (table && body && body.rows.length > 0) {
      const rowHeight = body.getBoundingClientRect().height / body.rows.length;
      const projectedRows = countVisibleRows(
        tree,
        (path) => state.expanded.has(path) || pending.has(path),
      );
      const extra = (projectedRows - body.rows.length) * rowHeight;
      fits =
        table.getBoundingClientRect().bottom + extra + window.scrollY <=
        window.innerHeight;
    }

    setState((prev) => {
      const expanded = new Set(prev.expanded);
      const decided = new Set(prev.decided);
      pending.forEach((path) => {
        if (decided.has(path)) return;
        decided.add(path);
        if (fits) expanded.add(path);
      });
      return { expanded, decided };
    });
  }, [tree, folderPaths, state, enabled]);

  const setExpanded = (update: (prev: Set<string>) => Set<string>) =>
    setState((prev) => ({ ...prev, expanded: update(prev.expanded) }));

  return {
    isExpanded: (path: string) => state.expanded.has(path),
    toggle: (path: string) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (!next.delete(path)) next.add(path);
        return next;
      }),
    expandAll: () => setExpanded(() => new Set(folderPaths)),
    collapseAll: () => setExpanded(() => new Set()),
  };
};

const FolderRow = ({
  folder,
  position,
  connectors,
  expanded,
  onToggle,
  actions,
  style,
}: {
  folder: FolderNode;
  position: RowPosition;
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
      {...rowAria(position)}
      aria-expanded={expanded}
      className={classes.folderRow}
      style={style}
      onClick={onToggle}
      data-folder-path={folder.path}
    >
      <td role="gridcell" style={nameCellStyle(theme, position.depth)}>
        {connectors && <TreeConnectors {...connectors} />}
        <Group spacing={6} noWrap>
          <ActionIcon
            color={theme.primaryColor}
            variant="subtle"
            size={ICON_SIZE}
            aria-expanded={expanded}
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
          <Box className={classes.folderLabel}>
            <Text component="span" weight={600} sx={{ minWidth: 0 }}>
              {folder.name}
            </Text>
            <Text
              component="span"
              size="xs"
              color="dimmed"
              className={classes.fileCount}
            >
              <FormattedMessage
                id="filelist.folder.file-count"
                values={{ count: folder.allFiles.length }}
              />
            </Text>
          </Box>
        </Group>
      </td>
      <td role="gridcell">{byteToHumanSizeString(folder.size)}</td>
      <td role="gridcell" onClick={(e) => e.stopPropagation()}>
        {actions}
      </td>
    </tr>
  );
};

const FileRow = ({
  file,
  position,
  connectors,
  actions,
  style,
}: {
  file: FileTreeFile;
  position: RowPosition;
  connectors?: Connectors;
  actions: ReactNode;
  style?: CSSProperties;
}) => {
  const { theme } = useStyles();

  return (
    <tr {...rowAria(position)} style={style} data-file-path={file.path}>
      <td role="gridcell" style={nameCellStyle(theme, position.depth)}>
        {connectors && <TreeConnectors {...connectors} />}
        {file.name}
      </td>
      <td role="gridcell">{byteToHumanSizeString(file.size)}</td>
      <td role="gridcell">{actions}</td>
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
  renderFolderActions?: (folder: FolderNode) => ReactNode;
  getFileStyle?: (item: T, index: number) => CSSProperties | undefined;
  getFolderStyle?: (folder: FolderNode) => CSSProperties | undefined;
}) => {
  const { classes, theme } = useStyles();
  const t = useTranslate();
  const tableRef = useRef<HTMLTableElement>(null);
  const itemIds = useRef(new WeakMap<T, number>());
  const nextItemId = useRef(0);

  const structure = useMemo(
    () => files.map((file) => `${getPath(file)}\0${getSize(file)}`).join("\0"),
    [files, getPath, getSize],
  );
  const tree = useMemo(
    () => buildFileTree(files, getPath, getSize),
    [structure],
  );
  const sortedTree = useMemo(() => sortFileTree(tree, sort), [tree, sort]);
  const folderPaths = useMemo(() => getFolderPaths(tree), [tree]);
  const treeDepth = useMemo(() => Math.max(1, getMaxDepth(tree)), [tree]);
  const { isExpanded, toggle, expandAll, collapseAll } = useFolderExpansion(
    tree,
    folderPaths,
    tableRef,
    !loadingRows,
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
      Icon: TbArrowsVertical,
      onClick: expandAll,
    },
    { label: "filelist.collapse-all", Icon: TbFold, onClick: collapseAll },
  ];

  const renderRows = (
    folder: FolderNode,
    depth: number,
    trail: boolean[],
  ): ReactNode[] => {
    const setSize = folder.folders.length + folder.files.length;
    const connectorsAt = (i: number) =>
      depth > 0 ? { trail, isLast: i === setSize - 1 } : undefined;

    return [
      ...folder.folders.flatMap((sub, i) => {
        const expanded = isExpanded(sub.path);
        const connectors = connectorsAt(i);
        return [
          <FolderRow
            key={`folder:${sub.path}`}
            folder={sub}
            position={{ depth, index: i, setSize }}
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
        const item = files[file.index];
        const index = folder.folders.length + i;
        return (
          <FileRow
            key={`file:${keyOf(item)}`}
            file={file}
            position={{ depth, index, setSize }}
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
      <Table
        ref={tableRef}
        role="treegrid"
        className={classes.tree}
        style={{ "--tree-depth": treeDepth } as CSSProperties}
      >
        <thead>
          <tr role="row">
            <th
              role="columnheader"
              aria-sort={ariaSort(sort, "name")}
              className={classes.headerCell}
            >
              {nameHeader}
            </th>
            <th
              role="columnheader"
              aria-sort={ariaSort(sort, "size")}
              className={classes.headerCell}
            >
              {sizeHeader}
            </th>
            <th role="columnheader" className={classes.headerCell}>
              {folderPaths.length > 0 && (
                <Group
                  position="right"
                  spacing={4}
                  noWrap
                  className={classes.headerActions}
                >
                  {headerActions.map(({ label, Icon, onClick }) => (
                    <HoverTip key={label} label={t(label)} touch={false}>
                      <ActionIcon
                        color={theme.primaryColor}
                        variant="subtle"
                        size={ICON_SIZE}
                        className={classes.headerActionIcon}
                        aria-label={t(label)}
                        onClick={onClick}
                      >
                        <Icon />
                      </ActionIcon>
                    </HoverTip>
                  ))}
                </Group>
              )}
            </th>
          </tr>
        </thead>
        <tbody>{loadingRows ?? renderRows(sortedTree, 0, [])}</tbody>
      </Table>
    </Box>
  );
};

export default FileTree;
