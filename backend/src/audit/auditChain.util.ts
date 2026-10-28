import * as crypto from "crypto";

export const GENESIS_HASH = "0".repeat(64);

export type AuditAction =
  | "share_created"
  | "file_uploaded"
  | "download"
  | "bad_password"
  | "revoked"
  | "auto_revoked"
  | "share_deleted"
  | "login_failed";

export type AuditEventInput = {
  action: AuditAction;
  shareId?: string;
  userId?: string;
  ipHash?: string;
  detail?: Record<string, unknown>;
};

export type AuditDoc = AuditEventInput & {
  seq: number;
  ts: string;
  prevHash: string;
  hash: string;
};

/** Deterministic JSON: object keys sorted recursively, undefined dropped. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function computeHash(doc: Omit<AuditDoc, "hash">): string {
  const { prevHash, ...rest } = doc;
  return crypto
    .createHash("sha256")
    .update(prevHash + canonicalJson(rest))
    .digest("hex");
}

/** Verifies a list of docs in ascending seq order (links to the first doc's prevHash). */
export function verifyDocs(docs: AuditDoc[]): {
  ok: boolean;
  checked: number;
  brokenAt?: number;
} {
  let checked = 0;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const { hash, ...rest } = d;
    const linked = i === 0 || d.prevHash === docs[i - 1].hash;
    if (!linked || computeHash(rest) !== hash) {
      return { ok: false, checked, brokenAt: d.seq };
    }
    if (i > 0 && d.seq !== docs[i - 1].seq + 1) {
      return { ok: false, checked, brokenAt: d.seq };
    }
    checked++;
  }
  return { ok: true, checked };
}
