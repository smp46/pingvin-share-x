import {
  ActionIcon,
  Group,
  Table,
  Text,
  MantineTheme,
  createStyles,
  useMantineTheme,
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
import {
  FolderNode,
  buildFileTree,
  getFolderPaths,
  sortFileTree,
} from "../../utils/fileTree.util";
import { HoverTip } from "./HoverTip";
import { TableSort } from "./SortIcon";

const ICON_SIZE = 25;

const indent = (theme: MantineTheme) =>
  `calc(${ICON_SIZE}px + ${theme.spacing.xs})`;

const useStyles = createStyles((theme, { depth }: { depth: number }) => ({
  nameCell:
    depth > 0
      ? {
          position: "relative",
          paddingInlineStart: `calc(${theme.spacing.xs} + ${depth} * ${indent(theme)}) !important`,
        }
      : {},
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
  const theme = useMantineTheme();
  const { classes } = useStyles({ depth: trail.length + 1 });
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
  const theme = useMantineTheme();
  const { classes } = useStyles({ depth });
  const t = useTranslate();
  const FolderIcon = expanded ? TbFolderOpen : TbFolder;

  return (
    <tr
      className={classes.folderRow}
      style={style}
      onClick={onToggle}
      aria-expanded={expanded}
      data-folder-path={folder.path}
    >
      <td className={classes.nameCell}>
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
              values={{ count: folder.count }}
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
  name,
  path,
  size,
  depth,
  connectors,
  actions,
  style,
}: {
  name: string;
  path: string;
  size: number;
  depth: number;
  connectors?: Connectors;
  actions: ReactNode;
  style?: CSSProperties;
}) => {
  const { classes } = useStyles({ depth });

  return (
    <tr style={style} data-file-path={path}>
      <td className={classes.nameCell}>
        {connectors && <TreeConnectors {...connectors} />}
        {name}
      </td>
      <td>{byteToHumanSizeString(size)}</td>
      <td>{actions}</td>
    </tr>
  );
};

const FileTree = <T,>({
  files,
  getPath,
  getSize,
  sort,
  nameHeader,
  sizeHeader,
  isLoading = false,
  loadingRows,
  renderFileActions,
  renderFolderActions,
  getFileStyle,
  getFolderStyle,
}: {
  files: T[];
  getPath: (item: T) => string;
  getSize: (item: T) => number;
  sort?: TableSort;
  nameHeader: ReactNode;
  sizeHeader: ReactNode;
  isLoading?: boolean;
  loadingRows?: ReactNode;
  renderFileActions: (item: T, index: number) => ReactNode;
  renderFolderActions?: (folder: FolderNode<T>) => ReactNode;
  getFileStyle?: (item: T) => CSSProperties | undefined;
  getFolderStyle?: (folder: FolderNode<T>) => CSSProperties | undefined;
}) => {
  const theme = useMantineTheme();
  const t = useTranslate();
  const tableRef = useRef<HTMLTableElement>(null);

  const tree = useMemo(
    () => buildFileTree(files, getPath, getSize),
    [files, getPath, getSize],
  );
  const sortedTree = useMemo(
    () => (sort ? sortFileTree(tree, sort) : tree),
    [tree, sort],
  );
  const folderPaths = useMemo(() => getFolderPaths(tree), [tree]);
  const { isExpanded, toggle, expandAll, collapseAll } = useFolderExpansion(
    folderPaths,
    tableRef,
  );

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
      ...folder.files.map((file, i) => (
        <FileRow
          key={`file:${file.index}`}
          name={file.name}
          path={file.path}
          size={file.size}
          depth={depth}
          connectors={connectorsAt(folder.folders.length + i)}
          actions={renderFileActions(file.item, file.index)}
          style={getFileStyle?.(file.item)}
        />
      )),
    ];
  };

  return (
    <Table ref={tableRef}>
      <thead>
        <tr>
          <th>
            {folderPaths.length > 0 ? (
              <Group spacing="xs" noWrap>
                {nameHeader}
                <Group spacing={4} noWrap>
                  <HoverTip label={t("filelist.expand-all")}>
                    <ActionIcon
                      color={theme.primaryColor}
                      variant="subtle"
                      size={ICON_SIZE}
                      aria-label={t("filelist.expand-all")}
                      onClick={expandAll}
                    >
                      <TbFolders />
                    </ActionIcon>
                  </HoverTip>
                  <HoverTip label={t("filelist.collapse-all")}>
                    <ActionIcon
                      color={theme.primaryColor}
                      variant="subtle"
                      size={ICON_SIZE}
                      aria-label={t("filelist.collapse-all")}
                      onClick={collapseAll}
                    >
                      <TbFoldersOff />
                    </ActionIcon>
                  </HoverTip>
                </Group>
              </Group>
            ) : (
              nameHeader
            )}
          </th>
          <th>{sizeHeader}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>{isLoading ? loadingRows : renderRows(sortedTree, 0, [])}</tbody>
    </Table>
  );
};

export default FileTree;
