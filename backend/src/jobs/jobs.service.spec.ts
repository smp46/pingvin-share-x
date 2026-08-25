import { JobsService } from "./jobs.service";

// The expiry job deletes files, and nothing puts them back. It trusts the
// database to answer "which shares have expired" correctly, and once that
// answer was wrong: dates written by an older release compared as smaller than
// every threshold, so shares with a future expiration, and shares marked never
// to expire, came back as expired and were deleted a minute later.
//
// These cover the check that stands between a wrong answer and a deletion.

const DAY = 86_400_000;

const build = () => {
  const deletedFiles: string[] = [];
  const deletedShares: string[] = [];
  const deletedUsers: string[] = [];
  const errors: string[] = [];

  const shares: any[] = [];
  const users: any[] = [];
  const prisma = {
    share: {
      findMany: async () => shares,
      delete: async ({ where }: any) => void deletedShares.push(where.id),
    },
    user: {
      findMany: async () => users,
      delete: async ({ where }: any) => void deletedUsers.push(where.id),
    },
  };
  const fileService = {
    deleteAllFiles: async (id: string) => void deletedFiles.push(id),
  };
  const configServer = {
    get: () => ({ value: 3, unit: "days" }),
  };

  const service = new JobsService(
    prisma as any,
    {} as any,
    fileService as any,
    configServer as any,
  );
  (service as any).logger = {
    log: () => undefined,
    error: (m: string) => void errors.push(m),
  };

  return {
    service,
    shares,
    users,
    deletedFiles,
    deletedShares,
    deletedUsers,
    errors,
  };
};

const share = (id: string, expiration: Date | number, extra = {}) => ({
  id,
  expiration:
    typeof expiration === "number" ? new Date(expiration) : expiration,
  blockedAt: null,
  ...extra,
});

describe("deleteExpiredShares", () => {
  it("deletes a share whose expiration is past the retention period", async () => {
    const { service, shares, deletedFiles, deletedShares } = build();
    shares.push(share("long-gone", Date.now() - 30 * DAY));

    await service.deleteExpiredShares();

    expect(deletedShares).toEqual(["long-gone"]);
    expect(deletedFiles).toEqual(["long-gone"]);
  });

  // the shape of the incident: the query hands back a share that is still valid
  it("deletes nothing when the query returns a share that has not expired", async () => {
    const { service, shares, deletedFiles, deletedShares, errors } = build();
    shares.push(share("long-gone", Date.now() - 30 * DAY));
    shares.push(share("still-valid", Date.now() + 30 * DAY));

    await service.deleteExpiredShares();

    expect(deletedShares).toEqual([]);
    expect(deletedFiles).toEqual([]);
    expect(errors[0]).toContain("still-valid");
  });

  it("deletes nothing when the query returns a share marked never to expire", async () => {
    const { service, shares, deletedShares, errors } = build();
    shares.push(share("long-gone", Date.now() - 30 * DAY));
    shares.push(share("never-expires", 0));

    await service.deleteExpiredShares();

    expect(deletedShares).toEqual([]);
    expect(errors[0]).toContain("never-expires");
  });

  // a date the client could not make sense of must not read as "long ago"
  it("deletes nothing when an expiration is not a usable date", async () => {
    const { service, shares, deletedShares, errors } = build();
    shares.push(share("unreadable", new Date(NaN)));

    await service.deleteExpiredShares();

    expect(deletedShares).toEqual([]);
    expect(errors[0]).toContain("unreadable");
  });

  it("keeps a blocked share even if the query offers it up", async () => {
    const { service, shares, deletedShares, errors } = build();
    shares.push(
      share("under-investigation", Date.now() - 30 * DAY, {
        blockedAt: new Date(),
      }),
    );

    await service.deleteExpiredShares();

    expect(deletedShares).toEqual([]);
    expect(errors[0]).toContain("under-investigation");
  });

  it("says how many rows it refused and names them", async () => {
    const { service, shares, errors } = build();
    shares.push(share("a", Date.now() + DAY));
    shares.push(share("b", Date.now() + DAY));
    shares.push(share("c", Date.now() - 30 * DAY));

    await service.deleteExpiredShares();

    expect(errors[0]).toContain("refusing to delete 3 row(s)");
    expect(errors[0]).toContain("2 of them do not qualify");
    expect(errors[0]).toContain("a, b");
  });

  it("stays quiet and does nothing when retention is switched off", async () => {
    const { service, shares, deletedShares, errors } = build();
    shares.push(share("whatever", Date.now() - 30 * DAY));
    (service as any).configServer = {
      get: () => ({ value: -1, unit: "days" }),
    };

    await service.deleteExpiredShares();

    expect(deletedShares).toEqual([]);
    expect(errors).toEqual([]);
  });
});

const HOUR = 3_600_000;

const unactivated = (id: string, createdAt: Date | number, extra = {}) => ({
  id,
  isActivated: false,
  createdAt: typeof createdAt === "number" ? new Date(createdAt) : createdAt,
  shares: [],
  ...extra,
});

// The same backstop as the share jobs, on the one that deletes accounts and
// everything they uploaded. It was left without one when the others got it.
describe("deleteUnactivatedUsers", () => {
  it("deletes an account that was never activated and has gone cold", async () => {
    const { service, users, deletedUsers } = build();
    users.push(unactivated("stale", Date.now() - 48 * HOUR));

    await service.deleteUnactivatedUsers();

    expect(deletedUsers).toEqual(["stale"]);
  });

  it("deletes nothing when the query returns an account inside the window", async () => {
    const { service, users, deletedUsers, errors } = build();
    users.push(unactivated("stale", Date.now() - 48 * HOUR));
    users.push(unactivated("fresh", Date.now() - 1 * HOUR));

    await service.deleteUnactivatedUsers();

    expect(deletedUsers).toEqual([]);
    expect(errors[0]).toContain("fresh");
  });

  it("deletes nothing when the query returns an activated account", async () => {
    const { service, users, deletedUsers, errors } = build();
    users.push(
      unactivated("active", Date.now() - 48 * HOUR, { isActivated: true }),
    );

    await service.deleteUnactivatedUsers();

    expect(deletedUsers).toEqual([]);
    expect(errors[0]).toContain("active");
  });

  it("deletes nothing when a created date is not a usable one", async () => {
    const { service, users, deletedUsers, errors } = build();
    users.push(unactivated("unreadable", new Date(NaN)));

    await service.deleteUnactivatedUsers();

    expect(deletedUsers).toEqual([]);
    expect(errors[0]).toContain("unreadable");
  });
});
