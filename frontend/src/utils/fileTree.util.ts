import type { TableSort } from "../components/core/SortIcon";

export type FileTreeFile<T> = {
  item: T;
  // Position in the original files array, used by index-based list actions
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
  size: number;
  count: number;
};

const createFolder = <T>(name: string, path: string): FolderNode<T> => ({
  name,
  path,
  folders: [],
  files: [],
  size: 0,
  count: 0,
});

// Merges folders that only contain a single folder into one node ("a/b/c")
const compactFolder = <T>(folder: FolderNode<T>): FolderNode<T> => {
  let node = folder;
  while (node.files.length === 0 && node.folders.length === 1) {
    const child = node.folders[0];
    node = { ...child, name: `${node.name}/${child.name}` };
  }
  return { ...node, folders: node.folders.map(compactFolder) };
};

const computeTotals = <T>(folder: FolderNode<T>) => {
  folder.folders.forEach(computeTotals);
  folder.size =
    folder.files.reduce((total, file) => total + file.size, 0) +
    folder.folders.reduce((total, sub) => total + sub.size, 0);
  folder.count =
    folder.files.length +
    folder.folders.reduce((total, sub) => total + sub.count, 0);
};

export const buildFileTree = <T>(
  items: T[],
  getPath: (item: T) => string,
  getSize: (item: T) => number,
): FolderNode<T> => {
  const root = createFolder<T>("", "");
  const foldersByPath = new Map<string, FolderNode<T>>([["", root]]);

  items.forEach((item, index) => {
    const parts = getPath(item).split("/").filter(Boolean);
    const filePath = parts.join("/");
    const name = parts.pop() ?? "";

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

export const sortFileTree = <T>(
  folder: FolderNode<T>,
  sort: TableSort,
): FolderNode<T> => {
  if (!sort.property) return folder;

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

export const getFolderPaths = <T>(folder: FolderNode<T>): string[] =>
  folder.folders.flatMap((sub) => [sub.path, ...getFolderPaths(sub)]);

export const getFolderFiles = <T>(folder: FolderNode<T>): FileTreeFile<T>[] => [
  ...folder.files,
  ...folder.folders.flatMap(getFolderFiles),
];
