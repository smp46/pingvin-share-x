import { JwtService } from "@nestjs/jwt";
import { Cache } from "cache-manager";
import { ConfigService } from "../../config/config.service";
import { OAuthCallbackDto } from "../dto/oauthCallback.dto";
import { GenericOidcProvider, OidcIdToken } from "./genericOidc.provider";

// Minimal concrete provider so the abstract base can be driven directly.
class TestProvider extends GenericOidcProvider {
  constructor(config: ConfigService, jwt: JwtService, cache: Cache) {
    super("test", [], config, jwt, cache);
  }
  protected getDiscoveryUri(): string {
    return "https://example.invalid/.well-known/openid-configuration";
  }
}

const NONCE = "nonce-value";

const buildProvider = (idToken: Partial<OidcIdToken>) => {
  const config = {
    get: jest.fn().mockReturnValue(""),
    addListener: jest.fn(),
  } as unknown as ConfigService;

  const jwt = {
    decode: jest.fn().mockReturnValue({
      sub: "subject-1",
      nonce: NONCE,
      name: "Test User",
      ...idToken,
    }),
  } as unknown as JwtService;

  const cache = {
    get: jest.fn().mockResolvedValue(NONCE),
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as Cache;

  return new TestProvider(config, jwt, cache);
};

const signIn = (idToken: Partial<OidcIdToken>) =>
  buildProvider(idToken).getUserInfo(
    { idToken: "stub", accessToken: "a", tokenType: "Bearer" } as any,
    { state: "state-1" } as OAuthCallbackDto,
  );

describe("GenericOidcProvider email verification", () => {
  it("accepts an explicitly verified address", async () => {
    const user = await signIn({
      email: "user@example.com",
      email_verified: true,
    });
    expect(user.email).toBe("user@example.com");
  });

  // Microsoft and Entra ID never send email_verified. Requiring it locked
  // every Microsoft user out, so a missing claim must stay acceptable.
  it("accepts a missing email_verified claim", async () => {
    const user = await signIn({ email: "user@example.com" });
    expect(user.email).toBe("user@example.com");
  });

  it("rejects an address the provider says is unverified", async () => {
    await expect(
      signIn({ email: "user@example.com", email_verified: false }),
    ).rejects.toMatchObject({ key: "email_not_verified" });
  });

  it("does not care about the claim when no email is sent at all", async () => {
    const user = await signIn({ email: undefined });
    expect(user.providerId).toBe("subject-1");
  });
});
