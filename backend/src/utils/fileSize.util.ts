export function byteToHumanSizeString(bytes: number) {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)).toString());
  return (bytes / Math.pow(1000, i)).toFixed(1).toString() + " " + sizes[i];
}
