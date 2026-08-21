import * as path from "path";
import { toAdapterUrl } from "./sqliteUrl";

const anchored = (relative: string) =>
  `file:${path.resolve(process.cwd(), "prisma", relative)}`;

describe("toAdapterUrl", () => {
  // the shipped default, and what every existing deployment inherits
  it("keeps the default pointing at backend/data", () => {
    expect(toAdapterUrl("file:../data/pingvin-share.db?connection_limit=1")).toBe(
      anchored("../data/pingvin-share.db"),
    );
  });

  // without this the adapter opens a file with "?" in its name, which looks
  // like a working but completely empty database
  it("drops the query parameters", () => {
    expect(toAdapterUrl("file:/var/db/app.db?connection_limit=1")).toBe(
      "file:/var/db/app.db",
    );
    expect(toAdapterUrl("file:/var/db/app.db?a=1&b=2")).toBe(
      "file:/var/db/app.db",
    );
  });

  it("leaves an absolute path alone", () => {
    expect(toAdapterUrl("file:/opt/app/backend/data/x.db")).toBe(
      "file:/opt/app/backend/data/x.db",
    );
  });

  // Prisma 6 resolved these against the schema directory, not the process
  it("anchors a relative path on the schema directory", () => {
    expect(toAdapterUrl("file:./local.db")).toBe(anchored("./local.db"));
    expect(toAdapterUrl("file:../data/other.db")).toBe(
      anchored("../data/other.db"),
    );
  });

  it("never returns a path containing a query string", () => {
    for (const url of [
      "file:../data/pingvin-share.db?connection_limit=1",
      "file:/abs/path.db?x=1",
      "file:./rel.db?y=2",
    ]) {
      expect(toAdapterUrl(url)).not.toContain("?");
    }
  });

  it("passes through anything that is not a file url", () => {
    expect(toAdapterUrl("postgresql://host/db")).toBe("postgresql://host/db");
  });
});
