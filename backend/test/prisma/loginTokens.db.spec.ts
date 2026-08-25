import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../../src/auth/auth.service";
import { DB_URL } from "./setup";

// A login token is the half-finished half of a totp sign in, and it travels in
// the url as /auth/totp/<token>. Browser history, referer headers and access
// logs all keep a copy, so how long an unused one stays valid is worth pinning
// down against a real database rather than a stand-in for one.

let prisma: PrismaClient;
let service: AuthService;

const unused = {} as any;

const makeUser = async () => {
  const n = `lt-${Math.random().toString(36).slice(2, 10)}`;
  return prisma.user.create({
    data: { username: n, email: `${n}@example.invalid` },
  });
};

const tokensFor = (userId: string) =>
  prisma.loginToken.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

beforeAll(async () => {
  prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: DB_URL }),
  });
  await prisma.$connect();

  // createLoginToken only reaches prisma, the rest of the constructor is not
  // touched by it
  service = new AuthService(
    prisma as any,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createLoginToken", () => {
  it("hands back a token that is ready to use", async () => {
    const user = await makeUser();

    const token = await service.createLoginToken(user.id);

    const stored = await prisma.loginToken.findUnique({ where: { token } });
    expect(stored).not.toBeNull();
    expect(stored!.used).toBe(false);
    expect(stored!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // three mistyped codes used to leave three usable tokens behind
  it("retires the token from an attempt that was never finished", async () => {
    const user = await makeUser();

    const first = await service.createLoginToken(user.id);
    const second = await service.createLoginToken(user.id);

    const stored = await tokensFor(user.id);
    expect(stored).toHaveLength(2);
    expect(stored.find((t) => t.token === first)!.used).toBe(true);
    expect(stored.find((t) => t.token === second)!.used).toBe(false);
  });

  it("leaves exactly one usable however many attempts were started", async () => {
    const user = await makeUser();

    for (let i = 0; i < 4; i++) await service.createLoginToken(user.id);

    const stored = await tokensFor(user.id);
    expect(stored).toHaveLength(4);
    expect(stored.filter((t) => !t.used)).toHaveLength(1);
  });

  it("does not touch another account's sign in", async () => {
    const mine = await makeUser();
    const theirs = await makeUser();

    const theirToken = await service.createLoginToken(theirs.id);
    await service.createLoginToken(mine.id);

    const stored = await prisma.loginToken.findUnique({
      where: { token: theirToken },
    });
    expect(stored!.used).toBe(false);
  });

  it("leaves a token that was already spent alone", async () => {
    const user = await makeUser();
    const spent = await service.createLoginToken(user.id);
    await prisma.loginToken.update({
      where: { token: spent },
      data: { used: true },
    });

    await service.createLoginToken(user.id);

    const stored = await prisma.loginToken.findUnique({ where: { token: spent } });
    expect(stored!.used).toBe(true);
  });
});
