import {
  RUN_ID,
  TEST_PASSWORD,
  api,
  deleteAccount,
  getConfig,
  signIn,
  signUp,
} from "./helpers/api";

// Rate limiting is 20 auth calls per 5 minutes per IP, so the account is
// created once and reused instead of one per test case.
describe("accounts and sign in", () => {
  let account: Awaited<ReturnType<typeof signUp>>;

  beforeAll(async () => {
    const allowRegistration = await getConfig("share.allowRegistration");
    if (allowRegistration !== "true") {
      throw new Error(
        "share.allowRegistration is off, the integration suite cannot create accounts",
      );
    }
    account = await signUp("auth");
  }, 60_000);

  afterAll(async () => {
    if (account) await deleteAccount(account.jar);
  });

  it("signs the new account in straight away", async () => {
    const me = await api("/users/me", { jar: account.jar });
    expect(me.status).toBe(200);
    expect(me.data.email).toBe(account.email);
  });

  it("refuses a second account on the same email", async () => {
    const res = await api("/auth/signUp", {
      method: "POST",
      body: {
        email: account.email,
        username: `${RUN_ID}_dupe`,
        password: TEST_PASSWORD,
      },
    });
    expect(res.status).toBe(400);
  });

  it("refuses a password below the minimum length", async () => {
    const res = await api("/auth/signUp", {
      method: "POST",
      body: {
        email: `${RUN_ID}-weak@integration.invalid`,
        username: `${RUN_ID}_weak`,
        password: "short",
      },
    });
    expect(res.status).toBe(400);
  });

  it("signs in with the right password", async () => {
    const { res, jar } = await signIn(account.email);
    expect(res.status).toBe(200);

    const me = await api("/users/me", { jar });
    expect(me.status).toBe(200);
    expect(me.data.email).toBe(account.email);
  });

  it("rejects the wrong password", async () => {
    const { res } = await signIn(account.email, "DefinitelyNotIt123!");
    expect(res.status).toBe(401);
  });

  it("keeps /users/me closed without a session", async () => {
    const res = await api("/users/me");
    expect([401, 403]).toContain(res.status);
  });
});
