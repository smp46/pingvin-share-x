import { PasswordGeneratorConfig } from "../types/password.type";

export const generateUUID = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
        +c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
      ).toString(16),
    );
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*",
};

function randomIndex(n: number): number {
  const limit = 2 ** 32 - (2 ** 32 % n);
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export function generatePassword(config: PasswordGeneratorConfig): string {
  const enabled = [
    config.includeLowercase && CHARSETS.lowercase,
    config.includeUppercase && CHARSETS.uppercase,
    config.includeNumbers && CHARSETS.numbers,
    config.includeSymbols && CHARSETS.symbols,
  ].filter((set): set is string => !!set);
  const sets = enabled.length > 0 ? enabled : Object.values(CHARSETS);

  let length =
    Number.isFinite(config.length) && config.length > 0 ? config.length : 8;
  length = Math.max(length, sets.length);

  const all = sets.join("");
  // Re-roll until every enabled set is represented, keeping the output uniform.
  for (;;) {
    let password = "";
    for (let i = 0; i < length; i++) password += all[randomIndex(all.length)];
    if (sets.every((set) => [...password].some((c) => set.includes(c))))
      return password;
  }
}
