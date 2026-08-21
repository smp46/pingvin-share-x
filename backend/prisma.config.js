const path = require("path");

// Prisma 6 resolved a relative file: url against the directory holding
// schema.prisma. Prisma 7 resolves it against this config file instead, which
// would send the default "file:../data/..." one level too high. Anchor it the
// old way so existing DATABASE_URL values keep pointing at the same file.
function resolveUrl(url) {
  const withoutQuery = url.split("?")[0];
  if (!withoutQuery.startsWith("file:")) return withoutQuery;
  const filePath = withoutQuery.slice("file:".length);
  if (path.isAbsolute(filePath)) return `file:${filePath}`;
  return `file:${path.resolve(__dirname, "prisma", filePath)}`;
}

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: resolveUrl(
      process.env.DATABASE_URL || "file:../data/pingvin-share.db",
    ),
  },
};
