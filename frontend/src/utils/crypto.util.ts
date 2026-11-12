import { PasswordGeneratorConfig } from "../types/password.type";
import { shuffleArray } from "./array.utils";
import { getDefaultCharset } from "./defaultConfig.util";

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

// Reference :- https://github.com/bitwarden/jslib/blob/master/common/src/services/crypto.service.ts#L677
export function getRandomNumber(min: number, max: number) {
  let rval = 0;
  const range = max - min;

  const bits_needed = Math.ceil(Math.log2(range));
  if (bits_needed > 53) {
    throw new Error("We cannot generate numbers larger than 53 bits.");
  }
  const bytes_needed = Math.ceil(bits_needed / 8);
  const mask = Math.pow(2, bits_needed) - 1;
  // 7776 -> (2^13 = 8192) -1 == 8191 or 0x00001111 11111111

  // Create byte array and fill with N random numbers
  const byteArray = new Uint8Array(bytes_needed);
  crypto.getRandomValues(byteArray);

  let p = (bytes_needed - 1) * 8;
  for (let i = 0; i < bytes_needed; i++) {
    rval += byteArray[i] * Math.pow(2, p);
    p -= 8;
  }

  // Use & to apply the mask and reduce the number of recursive lookups
  rval = rval & mask;

  if (rval >= range) {
    // Integer out of acceptable range
    return getRandomNumber(min, max);
  }
  // Return an integer that falls within the range
  return min + rval;
}

// Reference :- https://github.com/bitwarden/jslib/blob/master/common/src/services/passwordGeneration.service.ts#L41
export function generatePassword(options: PasswordGeneratorConfig) {
  let allCharset = "";
  const defaultCharset = getDefaultCharset();

  const passwordPlaceholders: ("L" | "U" | "N" | "S" | "A")[] = [];
  const passwordLength = options.length;

  if (options.includeLowercase) {
    allCharset += defaultCharset.lowercaseLetters;
    if (passwordPlaceholders.length < passwordLength) {
      passwordPlaceholders.push("L");
    }
  }
  if (options.includeUppercase) {
    allCharset += defaultCharset.uppercaseLetters;
    if (passwordPlaceholders.length < passwordLength) {
      passwordPlaceholders.push("U");
    }
  }
  if (options.includeNumbers) {
    allCharset += defaultCharset.numbers;
    if (passwordPlaceholders.length < passwordLength) {
      passwordPlaceholders.push("N");
    }
  }
  if (options.includeSymbols) {
    allCharset += defaultCharset.symbols;
    if (passwordPlaceholders.length < passwordLength) {
      passwordPlaceholders.push("S");
    }
  }

  const remainingSpace = passwordLength - passwordPlaceholders.length;

  for (let i = 0; i < remainingSpace; i++) {
    passwordPlaceholders.push("A");
  }

  shuffleArray(passwordPlaceholders);

  let generatedPassword = "";
  for (let i = 0; i < passwordPlaceholders.length; i++) {
    const placeHolder = passwordPlaceholders[i];
    let charSetToUse = "";

    switch (placeHolder) {
      case "A":
        charSetToUse = allCharset;
        break;

      case "L":
        charSetToUse = defaultCharset.lowercaseLetters;
        break;

      case "N":
        charSetToUse = defaultCharset.numbers;
        break;

      case "S":
        charSetToUse = defaultCharset.symbols;
        break;

      case "U":
        charSetToUse = defaultCharset.uppercaseLetters;
        break;

      default:
        break;
    }

    if (!charSetToUse) continue;

    generatedPassword += charSetToUse.charAt(
      getRandomNumber(0, charSetToUse.length),
    );
  }

  return generatedPassword;
}
