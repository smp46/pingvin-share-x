import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeHash,
  GENESIS_HASH,
  verifyDocs,
  type AuditDoc,
} from "../../src/audit/auditChain.util.ts";

function build(n: number): AuditDoc[] {
  const docs: AuditDoc[] = [];
  let prevHash = GENESIS_HASH;
  for (let seq = 1; seq <= n; seq++) {
    const base = {
      seq,
      ts: `2026-01-01T00:00:0${seq}.000Z`,
      action: "download" as const,
      shareId: "s1",
      detail: { b: 1, a: { y: 2, x: 3 } },
      prevHash,
    };
    const hash = computeHash(base);
    docs.push({ ...base, hash });
    prevHash = hash;
  }
  return docs;
}

test("valid chain verifies, key order is irrelevant", () => {
  const docs = build(4);
  assert.deepEqual(verifyDocs(docs), { ok: true, checked: 4 });
  docs[1].detail = { a: { x: 3, y: 2 }, b: 1 };
  assert.equal(verifyDocs(docs).ok, true);
});

test("tampered field is detected at its seq", () => {
  const docs = build(4);
  docs[2].action = "revoked";
  assert.deepEqual(verifyDocs(docs), { ok: false, checked: 2, brokenAt: 3 });
});

test("deleted doc breaks the chain", () => {
  const docs = build(4);
  docs.splice(1, 1);
  const r = verifyDocs(docs);
  assert.equal(r.ok, false);
  assert.equal(r.brokenAt, 3);
});
