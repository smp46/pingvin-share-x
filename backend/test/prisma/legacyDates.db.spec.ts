import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { DatabaseSync } from "node:sqlite";

// Prisma 6 wrote every DateTime as an integer of milliseconds. Prisma 7 goes
// through a driver adapter that writes ISO 8601 text. SQLite compares storage
// classes before values and every integer sorts below every string, so in a
// table holding both, "expiration < now" matches every row the older release
// wrote - including the ones set never to expire. That is what emptied the
// share list in production, so the conversion migration is pinned here.
//
// The shared suite database is built from the migrations and then written to
// by Prisma 7, so it can never contain a legacy row. This file therefore
// builds its own database and inserts the old format by hand, which is the
// case the rest of the suite structurally cannot reach.
//
//   npm run test:db

const DAY = 86_400_000;
const MIGRATION = path.resolve(
  __dirname,
  "../../prisma/migrations/20260823000000_datetime_integer_to_text/migration.sql",
);

const DB = path.join(os.tmpdir(), `pingvin-legacy-dates-${process.pid}.db`);
const remove = () => {
  for (const s of ["", "-journal", "-wal", "-shm"])
    if (fs.existsSync(`${DB}${s}`)) fs.unlinkSync(`${DB}${s}`);
};

const now = Date.now();

// a row exactly as a Prisma 6 release left it
const insertLegacy = (db: DatabaseSync, id: string, expirationMs: number) =>
  db.exec(
    `INSERT INTO Share (id, createdAt, updatedAt, expiration, views, uploadLocked, isZipReady, scanStatus, storageProvider)
     VALUES ('${id}', ${now}, ${now}, ${expirationMs}, 0, 1, 0, 'CLEAN', 'LOCAL')`,
  );

const applyMigration = (db: DatabaseSync) =>
  db.exec(fs.readFileSync(MIGRATION, "utf8"));

beforeAll(() => {
  remove();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: `file:${DB}` },
    stdio: "pipe",
  });
});

afterAll(remove);

describe("dates left behind by Prisma 6", () => {
  it("rewrites them as the same instant in the format the client uses", () => {
    const db = new DatabaseSync(DB);
    insertLegacy(db, "instant-one", 1784749875382);
    applyMigration(db);

    const row = db
      .prepare(
        "SELECT typeof(expiration) t, expiration v FROM Share WHERE id = 'instant-one'",
      )
      .get() as { t: string; v: string };
    db.close();

    expect(row.t).toBe("text");
    expect(row.v).toBe("2026-07-22T19:51:15.382+00:00");
    expect(Date.parse(row.v)).toBe(1784749875382);
  });

  it("leaves no DateTime column holding an integer", () => {
    const db = new DatabaseSync(DB);
    insertLegacy(db, "sweep-one", now);
    applyMigration(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'",
      )
      .all() as { name: string }[];

    const stragglers: string[] = [];
    for (const { name } of tables)
      for (const c of db.prepare(`PRAGMA table_info("${name}")`).all() as {
        name: string;
        type: string;
      }[]) {
        if (c.type.toUpperCase() !== "DATETIME") continue;
        const n = db
          .prepare(
            `SELECT COUNT(*) n FROM "${name}" WHERE typeof("${c.name}") = 'integer'`,
          )
          .get() as { n: number };
        if (Number(n.n) > 0) stragglers.push(`${name}.${c.name}`);
      }
    db.close();

    expect(stragglers).toEqual([]);
  });

  // the failure that reached production, stated as the query the cron job runs
  it("stops the expiry job from claiming shares that are still valid", async () => {
    const db = new DatabaseSync(DB);
    insertLegacy(db, "expiry-valid", now + 30 * DAY);
    insertLegacy(db, "expiry-never", 0);
    insertLegacy(db, "expiry-expired", now - 30 * DAY);
    applyMigration(db);
    db.close();

    const prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: `file:${DB}` }),
    });
    const expired = await prisma.share.findMany({
      where: {
        AND: [
          { expiration: { lt: new Date(now - 3 * DAY) } },
          { expiration: { not: new Date(0) } },
          { blockedAt: null },
        ],
        id: { startsWith: "expiry-" },
      },
      select: { id: true },
    });
    await prisma.$disconnect();

    expect(expired.map((s) => s.id)).toEqual(["expiry-expired"]);
  });
});
