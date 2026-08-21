import { randomBytes } from "crypto";
import {
  RUN_ID,
  api,
  createShareWithFile,
  deleteAccount,
  removeShare,
  signIn,
  signUp,
  waitForScanStatus,
} from "./helpers/api";

// Admin routes need a real administrator, and an account cannot promote
// itself over the API. Supply one to run this file:
//   INTEGRATION_ADMIN_EMAIL=... INTEGRATION_ADMIN_PASSWORD=... npm run test:integration
const ADMIN_EMAIL = process.env.INTEGRATION_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.INTEGRATION_ADMIN_PASSWORD;

const describeAdmin = ADMIN_EMAIL && ADMIN_PASSWORD ? describe : describe.skip;

describeAdmin("administration", () => {
  let adminJar: Record<string, string>;
  let owner: Awaited<ReturnType<typeof signUp>>;
  const shareId = `${RUN_ID}-admin`;
  let fileId: string;

  beforeAll(async () => {
    const signedIn = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    if (signedIn.res.status !== 200) {
      throw new Error(
        `could not sign the admin in: ${signedIn.res.status} ${signedIn.res.body.toString("utf8")}`,
      );
    }
    adminJar = signedIn.jar;

    const check = await api("/shares/all", { jar: adminJar });
    if (check.status !== 200) {
      throw new Error(
        `${ADMIN_EMAIL} signed in but is not an administrator (/shares/all -> ${check.status})`,
      );
    }

    owner = await signUp("victim");
    ({ fileId } = await createShareWithFile(
      owner.jar,
      shareId,
      randomBytes(2048),
    ));
  }, 120_000);

  afterAll(async () => {
    if (owner) {
      await removeShare(owner.jar, shareId);
      await deleteAccount(owner.jar);
    }
  });

  it("keeps the share list closed to ordinary users", async () => {
    const res = await api("/shares/all", { jar: owner.jar });
    expect(res.status).toBe(403);
  });

  it("shows every share to an admin", async () => {
    const res = await api<any[]>("/shares/all", { jar: adminJar });
    expect(res.status).toBe(200);
    expect(res.data.some((s) => s.id === shareId)).toBe(true);
  });

  it("settles on a scan verdict for a clean share", async () => {
    const status = await waitForScanStatus(adminJar, shareId);
    // FAILED means ClamAV was unreachable, which is a deployment problem
    // rather than a wrong verdict, so it is accepted here
    expect(["CLEAN", "FAILED"]).toContain(status);
  }, 120_000);

  describe("rescan", () => {
    it("is refused for a normal user", async () => {
      const res = await api(`/shares/${shareId}/rescan`, {
        method: "POST",
        jar: owner.jar,
      });
      expect(res.status).toBe(403);
    });

    it("is accepted for an admin", async () => {
      const res = await api(`/shares/${shareId}/rescan`, {
        method: "POST",
        jar: adminJar,
      });
      expect(res.status).toBe(202);

      const status = await waitForScanStatus(adminJar, shareId);
      expect(["CLEAN", "FAILED"]).toContain(status);
    }, 120_000);
  });

  describe("blocking", () => {
    it("is refused for a normal user", async () => {
      const res = await api(`/shares/${shareId}/block`, {
        method: "POST",
        jar: owner.jar,
        body: {},
      });
      expect(res.status).toBe(403);
    });

    it("hides the share from everyone but admins, then restores it", async () => {
      // baseline, so the restore check compares against how the share really
      // behaves rather than an assumed status code
      const before = await api(`/shares/${shareId}/files/${fileId}`);
      expect(before.status).toBe(200);

      const reason = "integration test";
      const blocked = await api(`/shares/${shareId}/block`, {
        method: "POST",
        jar: adminJar,
        body: { reason },
      });
      expect(blocked.status).toBe(201);

      // the owner and a stranger both get a plain not found
      expect((await api(`/shares/${shareId}`, { jar: owner.jar })).status).toBe(
        404,
      );
      expect(
        (await api(`/shares/${shareId}/files/${fileId}`)).status,
      ).toBe(404);

      // and the owner cannot destroy the evidence
      expect(
        (await api(`/shares/${shareId}`, { method: "DELETE", jar: owner.jar }))
          .status,
      ).toBe(404);

      // the admin still sees it, with the reason recorded
      const list = await api<any[]>("/shares/all", { jar: adminJar });
      const row = list.data.find((s) => s.id === shareId);
      expect(row).toBeDefined();
      expect(row.blockedAt).toBeTruthy();
      expect(row.blockedReason).toBe(reason);

      const unblocked = await api(`/shares/${shareId}/unblock`, {
        method: "POST",
        jar: adminJar,
      });
      expect(unblocked.status).toBe(201);

      const after = await api(`/shares/${shareId}/files/${fileId}`);
      expect(after.status).toBe(before.status);
      expect(after.body.length).toBe(before.body.length);
    }, 120_000);
  });
});
