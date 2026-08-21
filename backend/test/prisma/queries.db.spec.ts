import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { DB_PATH, DB_URL } from "./setup";

// Pins the behaviour of the query shapes this app actually issues, against a
// real SQLite file built from the real migrations. Run it before and after a
// Prisma upgrade: if the two runs disagree, the upgrade changed semantics the
// unit tests cannot see.
//
//   npm run test:db

let prisma: PrismaClient;

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

const makeShare = async (id: string, creatorId?: string) =>
  prisma.share.create({
    data: {
      id,
      expiration: new Date(Date.now() + 86_400_000),
      ...(creatorId ? { creatorId } : {}),
    },
  });

const makeUser = async () => {
  const n = uid("u");
  return prisma.user.create({
    data: { username: n, email: `${n}@example.invalid` },
  });
};

beforeAll(async () => {
  prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: DB_PATH }) });
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
  for (const suffix of ["", "-journal"]) {
    const f = `${DB_PATH}${suffix}`;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

describe("schema built from migrations", () => {
  it("creates every table the app queries", async () => {
    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    const names = rows.map((r) => r.name);
    for (const t of [
      "User",
      "Share",
      "File",
      "ShareSecurity",
      "ShareRecipient",
      "ShareUserRecipient",
      "ShareAccessLog",
      "ReverseShare",
      "Config",
      "OAuthUser",
    ]) {
      expect(names).toContain(t);
    }
  });

  // this index is created by a migration; the model has to keep declaring it
  // or a future migrate dev quietly drops it
  it("keeps the access log indexed by share", async () => {
    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ShareAccessLog'",
    );
    expect(rows.map((r) => r.name)).toContain("ShareAccessLog_shareId_idx");
  });

  it("uses that index instead of scanning the table", async () => {
    const plan = await prisma.$queryRawUnsafe<{ detail: string }[]>(
      "EXPLAIN QUERY PLAN SELECT ip, COUNT(*) FROM ShareAccessLog WHERE shareId='x' GROUP BY ip",
    );
    const detail = plan.map((p) => p.detail).join(" ");
    expect(detail).toContain("ShareAccessLog_shareId_idx");
    expect(detail).not.toContain("SCAN ShareAccessLog");
  });
});

describe("migrations and model agree", () => {
  // The real guard against schema drift. If the migrations produce a database
  // the model does not describe, migrate dev will silently generate a
  // correcting migration - which is how the access log index nearly got
  // dropped. Checking the built database is not enough, since the migration
  // creates the index whether or not the model mentions it.
  it("leaves nothing for migrate dev to generate", () => {
    const backend = path.resolve(__dirname, "../..");
    let output = "";
    let status = 0;
    try {
      output = execFileSync(
        "npx",
        [
          "prisma",
          "migrate",
          "diff",
          "--from-migrations",
          "prisma/migrations",
          "--to-schema",
          "prisma/schema.prisma",
          "--exit-code",
        ],
        { cwd: backend, env: { ...process.env, DATABASE_URL: DB_URL }, encoding: "utf8" },
      );
    } catch (e: any) {
      status = e.status ?? 1;
      output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    } finally {
      for (const f of [`${DB_PATH}.shadow`, `${DB_PATH}.shadow-journal`]) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    }

    // exit code 2 means "there is a difference"
    expect({ status, output: output.trim() }).toEqual({
      status: 0,
      output: expect.stringContaining("No difference detected"),
    });
  });
});

describe("groupBy with _count", () => {
  // the access log modal groups events per IP for one share
  it("counts events per ip for a single share", async () => {
    const share = await makeShare(uid("grp"));
    const rows = [
      { ip: "1.1.1.1", event: "CREATED" },
      { ip: "1.1.1.1", event: "VIEWED" },
      { ip: "1.1.1.1", event: "VIEWED" },
      { ip: "2.2.2.2", event: "VIEWED" },
    ];
    for (const r of rows) {
      await prisma.shareAccessLog.create({ data: { ...r, shareId: share.id } });
    }

    const grouped = await prisma.shareAccessLog.groupBy({
      by: ["ip"],
      where: { shareId: share.id },
      _count: { _all: true },
      orderBy: { ip: "asc" },
    });

    expect(grouped).toHaveLength(2);
    expect(grouped[0].ip).toBe("1.1.1.1");
    expect(grouped[0]._count._all).toBe(3);
    expect(grouped[1].ip).toBe("2.2.2.2");
    expect(grouped[1]._count._all).toBe(1);

    const total = await prisma.shareAccessLog.count({
      where: { shareId: share.id },
    });
    expect(total).toBe(4);
  });
});

describe("upsert on a compound unique", () => {
  // recipient auto-linking upserts on userId_shareId and must stay idempotent
  it("inserts once and then does nothing", async () => {
    const user = await makeUser();
    const share = await makeShare(uid("ups"));

    const args = {
      where: { userId_shareId: { userId: user.id, shareId: share.id } },
      create: { userId: user.id, shareId: share.id },
      update: {},
    };

    await prisma.shareUserRecipient.upsert(args);
    await prisma.shareUserRecipient.upsert(args);

    const count = await prisma.shareUserRecipient.count({
      where: { shareId: share.id },
    });
    expect(count).toBe(1);
  });

  it("runs a batch of upserts inside one transaction", async () => {
    const share = await makeShare(uid("tx"));
    const users = [await makeUser(), await makeUser(), await makeUser()];

    const run = () =>
      prisma.$transaction(
        users.map((u) =>
          prisma.shareUserRecipient.upsert({
            where: { userId_shareId: { userId: u.id, shareId: share.id } },
            create: { userId: u.id, shareId: share.id },
            update: {},
          }),
        ),
      );

    await run();
    await run();

    expect(
      await prisma.shareUserRecipient.count({ where: { shareId: share.id } }),
    ).toBe(3);
  });
});

describe("cascade deletes", () => {
  it("takes files, security, logs and recipients with the share", async () => {
    const user = await makeUser();
    const share = await makeShare(uid("csc"), user.id);

    await prisma.file.create({
      data: { name: "a.bin", size: "10", shareId: share.id },
    });
    await prisma.shareSecurity.create({ data: { shareId: share.id } });
    await prisma.shareAccessLog.create({
      data: { event: "CREATED", ip: "9.9.9.9", shareId: share.id },
    });
    await prisma.shareUserRecipient.create({
      data: { userId: user.id, shareId: share.id },
    });

    await prisma.share.delete({ where: { id: share.id } });

    expect(await prisma.file.count({ where: { shareId: share.id } })).toBe(0);
    expect(
      await prisma.shareAccessLog.count({ where: { shareId: share.id } }),
    ).toBe(0);
    expect(
      await prisma.shareUserRecipient.count({ where: { shareId: share.id } }),
    ).toBe(0);
    expect(
      await prisma.shareSecurity.findUnique({ where: { shareId: share.id } }),
    ).toBeNull();
  });

  it("takes the user's shares with the user", async () => {
    const user = await makeUser();
    const share = await makeShare(uid("usr"), user.id);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.share.findUnique({ where: { id: share.id } })).toBeNull();
  });
});

describe("nested reads the guards rely on", () => {
  it("loads security and recipients in one findUnique", async () => {
    const user = await makeUser();
    const share = await makeShare(uid("nst"), user.id);
    await prisma.shareSecurity.create({
      data: { shareId: share.id, maxViews: 5 },
    });
    await prisma.shareRecipient.create({
      data: { email: "who@example.invalid", shareId: share.id },
    });
    await prisma.shareUserRecipient.create({
      data: { userId: user.id, shareId: share.id },
    });

    const loaded = await prisma.share.findUnique({
      where: { id: share.id },
      include: {
        security: true,
        userRecipients: { select: { userId: true } },
        recipients: { select: { email: true } },
      },
    });

    expect(loaded.security.maxViews).toBe(5);
    expect(loaded.recipients).toEqual([{ email: "who@example.invalid" }]);
    expect(loaded.userRecipients).toEqual([{ userId: user.id }]);
  });

  it("counts relations with select _count", async () => {
    const share = await makeShare(uid("cnt"));
    await prisma.file.create({
      data: { name: "x", size: "1", shareId: share.id },
    });
    await prisma.file.create({
      data: { name: "y", size: "1", shareId: share.id },
    });

    const withCount = await prisma.share.findUnique({
      where: { id: share.id },
      include: { _count: { select: { files: true } } },
    });
    expect(withCount._count.files).toBe(2);
  });
});

describe("the cleanup jobs' filters", () => {
  // deleteUnfinishedShares and deleteExpiredShares both hang off these shapes,
  // including the blockedAt guard that keeps evidence around
  it("selects expired shares but skips never-expiring and blocked ones", async () => {
    const tag = uid("exp");
    const past = new Date(Date.now() - 86_400_000);

    const expired = await prisma.share.create({
      data: { id: `${tag}-old`, expiration: past },
    });
    await prisma.share.create({
      data: { id: `${tag}-never`, expiration: new Date(0) },
    });
    await prisma.share.create({
      data: { id: `${tag}-blocked`, expiration: past, blockedAt: new Date() },
    });

    const found = await prisma.share.findMany({
      where: {
        AND: [
          { expiration: { lt: new Date() } },
          { expiration: { not: new Date(0) } },
          { blockedAt: null },
        ],
        id: { startsWith: tag },
      },
    });

    expect(found.map((s) => s.id)).toEqual([expired.id]);
  });

  it("skips blocked shares when sweeping unfinished uploads", async () => {
    const tag = uid("unf");
    const cutoff = new Date(Date.now() - 86_400_000);

    await prisma.share.create({
      data: {
        id: `${tag}-stale`,
        expiration: new Date(Date.now() + 1000),
        uploadLocked: false,
        createdAt: cutoff,
      },
    });
    await prisma.share.create({
      data: {
        id: `${tag}-blocked`,
        expiration: new Date(Date.now() + 1000),
        uploadLocked: false,
        createdAt: cutoff,
        blockedAt: new Date(),
      },
    });

    const found = await prisma.share.findMany({
      where: {
        uploadLocked: false,
        blockedAt: null,
        createdAt: { lt: new Date() },
        id: { startsWith: tag },
      },
    });

    expect(found.map((s) => s.id)).toEqual([`${tag}-stale`]);
  });

  it("deletes a batch by id list", async () => {
    const tag = uid("bat");
    for (const n of ["a", "b", "c"]) {
      await prisma.share.create({
        data: { id: `${tag}-${n}`, expiration: new Date(Date.now() + 1000) },
      });
    }

    const deleted = await prisma.share.deleteMany({
      where: { id: { in: [`${tag}-a`, `${tag}-b`] } },
    });

    expect(deleted.count).toBe(2);
    expect(
      await prisma.share.count({ where: { id: { startsWith: tag } } }),
    ).toBe(1);
  });
});

describe("defaults the app depends on", () => {
  it("starts a share pending a scan and unblocked", async () => {
    const share = await makeShare(uid("def"));
    const loaded = await prisma.share.findUnique({ where: { id: share.id } });

    expect(loaded.scanStatus).toBe("PENDING");
    expect(loaded.blockedAt).toBeNull();
    expect(loaded.blockedReason).toBeNull();
    expect(loaded.views).toBe(0);
    expect(loaded.uploadLocked).toBe(false);
    expect(loaded.storageProvider).toBe("LOCAL");
  });

  it("refuses a duplicate email", async () => {
    const user = await makeUser();
    await expect(
      prisma.user.create({
        data: { username: uid("dup"), email: user.email },
      }),
    ).rejects.toThrow();
  });
});
