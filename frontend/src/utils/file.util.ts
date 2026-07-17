export const getNormalizedFileName = (file: File): string => {
  const pathName = file.webkitRelativePath || file.name;
  return pathName.replace(/\\/g, "/").replace(/^\//, "");
};
