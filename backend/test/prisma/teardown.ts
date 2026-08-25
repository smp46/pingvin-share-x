import * as fs from "fs";
import { DB_PATH } from "./setup";

// The throwaway database is shared by every spec in this config, so removing
// it belongs here rather than in whichever spec happens to finish first. It
// used to be an afterAll in one of them, which meant any spec jest scheduled
// after that one found no database at all.
export default async function globalTeardown() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const f = `${DB_PATH}${suffix}`;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}
