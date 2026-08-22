import * as path from "path";

// DATABASE_URL is set by every existing deployment and we do not get to change
// it, so both differences between Prisma 6 and 7 are absorbed here.
//
// 1. Prisma 6 accepted connection settings as query parameters. The
//    better-sqlite3 adapter treats the whole string as a path, so "?" and
//    everything after it would become part of the file name and the app would
//    silently open a new, empty database next to the real one.
//
// 2. Prisma 6 resolved a relative file: path against the directory holding
//    schema.prisma. The adapter resolves against the working directory
//    instead, which turns the default "file:../data/pingvin-share.db" into
//    <backend>/../data, one level too high. Anchoring on <cwd>/prisma keeps
//    the old meaning.
export function toAdapterUrl(databaseUrl: string): string {
  const withoutQuery = databaseUrl.split("?")[0];

  if (!withoutQuery.startsWith("file:")) return withoutQuery;

  const filePath = withoutQuery.slice("file:".length);
  if (filePath === "" || filePath.startsWith(":memory:")) return withoutQuery;
  if (path.isAbsolute(filePath)) return `file:${filePath}`;

  return `file:${path.resolve(process.cwd(), "prisma", filePath)}`;
}
