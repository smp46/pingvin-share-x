export const getNormalizedFileName = (file: File): string => {
  const pathName = file.webkitRelativePath || file.name;
  return pathName.replace(/\\/g, "/").replace(/^\//, "");
};

export const filterDuplicateFiles = <T extends File>(
  newFiles: T[],
  existingFilesList: Array<{ name: string; webkitRelativePath?: string; deleted?: boolean }>,
  onDuplicateDetected: (name: string) => void
): T[] => {
  const existingNames = new Set(
    existingFilesList
      .filter((file) => !file.deleted)
      .map((file) => {
        const pathName = file.webkitRelativePath || file.name;
        return pathName.replace(/\\/g, "/").replace(/^\//, "");
      })
  );

  const filtered: T[] = [];
  const seenInBatch = new Set<string>();

  for (const file of newFiles) {
    const normalizedName = getNormalizedFileName(file);
    if (existingNames.has(normalizedName) || seenInBatch.has(normalizedName)) {
      onDuplicateDetected(normalizedName);
    } else {
      seenInBatch.add(normalizedName);
      filtered.push(file);
    }
  }
  return filtered;
};
