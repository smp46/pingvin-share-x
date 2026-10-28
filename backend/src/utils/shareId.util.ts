import { randomBytes } from "node:crypto";

export function generateShareId(): string {
  return randomBytes(16).toString("base64url");
}
