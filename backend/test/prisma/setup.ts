import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// A throwaway SQLite file built from the real migrations. Never point this at
// the instance database - the suite writes and deletes rows freely.
export const DB_PATH = path.join(
  os.tmpdir(),
  `pingvin-prisma-check-${process.pid}.db`,
);
export const DB_URL = `file:${DB_PATH}`;

export default async function globalSetup() {
  for (const suffix of ["", "-journal"]) {
    const f = `${DB_PATH}${suffix}`;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  // build the schema the same way production does, so the suite is checking
  // the migrations themselves and not a schema push
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: DB_URL },
    stdio: "pipe",
  });

  process.env.PRISMA_CHECK_DB_URL = DB_URL;
}
