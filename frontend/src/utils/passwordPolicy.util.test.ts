import { resolvePasswordPolicy } from "./passwordPolicy.util";

const config = (values: Record<string, any>) => (key: string) => values[key];

describe("resolvePasswordPolicy", () => {
  it("reads every requirement from config when the policy is on", () => {
    expect(
      resolvePasswordPolicy(
        config({
          "security.customPasswordPolicy": true,
          "security.minLength": 14,
          "security.requireUppercase": true,
          "security.requireLowercase": true,
          "security.requireNumber": true,
          "security.requireSpecialCharacter": false,
        }),
      ),
    ).toEqual({
      minLength: 14,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialCharacter: false,
    });
  });

  // the part that is easy to get wrong: switching the policy off has to ignore
  // the individual settings rather than quietly keep enforcing them
  it("ignores the requirements entirely when the policy is off", () => {
    expect(
      resolvePasswordPolicy(
        config({
          "security.customPasswordPolicy": false,
          "security.minLength": 32,
          "security.requireUppercase": true,
          "security.requireLowercase": true,
          "security.requireNumber": true,
          "security.requireSpecialCharacter": true,
        }),
      ),
    ).toEqual({
      minLength: 8,
      requireUppercase: false,
      requireLowercase: false,
      requireNumber: false,
      requireSpecialCharacter: false,
    });
  });

  it("hands back a fresh object, so a caller cannot alter the fallback", () => {
    const off = config({ "security.customPasswordPolicy": false });
    const first = resolvePasswordPolicy(off);
    first.minLength = 99;

    expect(resolvePasswordPolicy(off).minLength).toBe(8);
  });
});
