import { CustomPasswordPolicy } from "../types/config.type";

// What the create-user form should enforce.
//
// The individual security.require* settings only apply when the custom policy
// is switched on. With it off the form falls back to a fixed minimum and no
// character requirements, deliberately ignoring whatever those settings happen
// to say, so that turning the policy off really does turn all of it off.
// built fresh each time, so a caller that edits what it gets back cannot
// change what the next one sees
const noPolicy = (): CustomPasswordPolicy => ({
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialCharacter: false,
});

export function resolvePasswordPolicy(
  get: (key: string) => any,
): CustomPasswordPolicy {
  if (!get("security.customPasswordPolicy")) return noPolicy();

  return {
    minLength: get("security.minLength"),
    requireUppercase: get("security.requireUppercase"),
    requireLowercase: get("security.requireLowercase"),
    requireNumber: get("security.requireNumber"),
    requireSpecialCharacter: get("security.requireSpecialCharacter"),
  };
}
