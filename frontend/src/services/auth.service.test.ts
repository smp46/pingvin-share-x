import * as jose from "jose";
import authService from "./auth.service";
import api from "./api.service";

// A tab whose session has gone must be able to get back to the sign in page.
// It used to be unable to: the refresh failed, the failure was swallowed, and
// the access token stayed in place. The middleware only decodes that token to
// decide where someone may go, while the server verifies it and refuses, so
// the page loaded and every request on it returned 403, every two minutes,
// forever.

jest.mock("./api.service", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const cookies: Record<string, string> = {};

jest.mock("cookies-next", () => ({
  getCookie: (name: string) => cookies[name],
  deleteCookie: (name: string) => {
    delete cookies[name];
  },
}));

const tokenExpiringIn = (ms: number) =>
  `x.${Buffer.from(
    JSON.stringify({ exp: Math.floor((Date.now() + ms) / 1000) }),
  ).toString("base64url")}.y`;

const refused = (status: number) =>
  Object.assign(new Error("refused"), { response: { status } });

beforeEach(() => {
  for (const k of Object.keys(cookies)) delete cookies[k];
  (api.post as jest.Mock).mockReset().mockResolvedValue({});
});

describe("refreshAccessToken", () => {
  it("does nothing when there is no session to refresh", async () => {
    await authService.refreshAccessToken();

    expect(api.post).not.toHaveBeenCalled();
  });

  it("leaves a token alone while it still has time on it", async () => {
    cookies.access_token = tokenExpiringIn(30 * 60 * 1000);

    await authService.refreshAccessToken();

    expect(api.post).not.toHaveBeenCalled();
    expect(cookies.access_token).toBeDefined();
  });

  it("refreshes one that is about to run out", async () => {
    cookies.access_token = tokenExpiringIn(30 * 1000);

    await authService.refreshAccessToken();

    expect(api.post).toHaveBeenCalledWith("/auth/token");
    expect(cookies.access_token).toBeDefined();
  });

  // the case that left a tab stuck
  it("drops the cookies when the server says the session is over", async () => {
    cookies.access_token = tokenExpiringIn(30 * 1000);
    cookies.refresh_token = "gone";
    (api.post as jest.Mock).mockRejectedValue(refused(401));

    await authService.refreshAccessToken();

    expect(cookies.access_token).toBeUndefined();
    expect(cookies.refresh_token).toBeUndefined();
  });

  it("does the same for a refusal", async () => {
    cookies.access_token = tokenExpiringIn(30 * 1000);
    (api.post as jest.Mock).mockRejectedValue(refused(403));

    await authService.refreshAccessToken();

    expect(cookies.access_token).toBeUndefined();
  });

  // a server being restarted is not a reason to sign anyone out
  it("keeps the session when the request simply did not get through", async () => {
    cookies.access_token = tokenExpiringIn(30 * 1000);
    (api.post as jest.Mock).mockRejectedValue(new Error("network down"));

    await authService.refreshAccessToken();

    expect(cookies.access_token).toBeDefined();
  });

  it("keeps it through a server error too", async () => {
    cookies.access_token = tokenExpiringIn(30 * 1000);
    (api.post as jest.Mock).mockRejectedValue(refused(502));

    await authService.refreshAccessToken();

    expect(cookies.access_token).toBeDefined();
  });

  // a cookie from somewhere else entirely
  it("drops a token it cannot read at all", async () => {
    cookies.access_token = "not-a-jwt";

    await authService.refreshAccessToken();

    expect(cookies.access_token).toBeUndefined();
    expect(api.post).not.toHaveBeenCalled();
  });
});

// guards the assumption the test file is built on
describe("the token helper used above", () => {
  it("produces something jose can read", () => {
    expect(jose.decodeJwt(tokenExpiringIn(1000)).exp).toBeGreaterThan(0);
  });
});
