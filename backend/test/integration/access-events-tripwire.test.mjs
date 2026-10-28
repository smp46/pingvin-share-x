// Run only against a session-owned database and backend; never shared data.
// Server must run with TRUST_PROXY=true (burst rule uses X-Forwarded-For).
// RV_TEST_API=http://127.0.0.1:3305/api DATABASE_URL=file:/tmp/.../pingvin-share.db node --test test/integration/access-events-tripwire.test.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import argon from "argon2";

const api = process.env.RV_TEST_API;
assert.ok(
  api && process.env.DATABASE_URL,
  "explicit isolated runtime required",
);
const prisma = new PrismaClient();
let alice, bob;

async function makeUser(label) {
  const email = `task6-${label}-${randomUUID()}@example.test`;
  const password = randomUUID();
  await prisma.user.create({
    data: {
      email,
      username: email,
      password: await argon.hash(password),
      isAdmin: false,
    },
  });
  const response = await fetch(`${api}/auth/signIn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
before(async () => {
  alice = await makeUser("a");
  bob = await makeUser("b");
});
after(async () => prisma.$disconnect());

async function post(path, session, body = {}, binary = false) {
  return fetch(`${api}/${path}`, {
    method: "POST",
    headers: {
      cookie: session,
      "content-type": binary ? "application/octet-stream" : "application/json",
    },
    body: binary ? body : JSON.stringify(body),
  });
}
async function newShare(security = {}) {
  const created = await post("shares", alice, {
    expiration: "1-day",
    recipients: [],
    security,
  });
  assert.equal(created.status, 201);
  const share = await created.json();
  const uploaded = await post(
    `shares/${share.id}/files?name=t6.txt&chunkIndex=0&totalChunks=1`,
    alice,
    "task 6 fixture\n",
    true,
  );
  assert.equal(uploaded.status, 201);
  const file = await uploaded.json();
  assert.equal((await post(`shares/${share.id}/complete`, alice)).status, 202);
  return { id: share.id, fileId: file.id };
}
async function download(id, fileId, headers = {}) {
  const r = await fetch(`${api}/shares/${id}/files/${fileId}`, { headers });
  await r.arrayBuffer();
  return r;
}
async function activity(id) {
  const r = await fetch(`${api}/shares/${id}/activity`, {
    headers: { cookie: alice },
  });
  assert.equal(r.status, 200);
  return r.json();
}
async function myShare(id) {
  const r = await fetch(`${api}/shares`, { headers: { cookie: alice } });
  return (await r.json()).find((s) => s.id === id);
}

test("counts full downloads only; range and owner downloads are skipped", async () => {
  const { id, fileId } = await newShare();
  for (let i = 0; i < 3; i++)
    assert.equal((await download(id, fileId)).status, 200);
  assert.equal(
    (await download(id, fileId, { range: "bytes=0-10" })).status,
    206,
  );
  assert.equal((await download(id, fileId, { cookie: alice })).status, 200);
  assert.equal((await myShare(id)).downloads, 3);
  const events = await activity(id);
  assert.equal(events.filter((e) => e.type === "download").length, 3);
  assert.ok(events.some((e) => e.type === "view"));
  for (const e of events) assert.equal("ipHash" in e, false);
  assert.deepEqual(Object.keys(events[0]).sort(), [
    "createdAt",
    "type",
    "userAgent",
  ]);
});

test("activity endpoint is owner-only", async () => {
  const { id } = await newShare();
  const anon = await fetch(`${api}/shares/${id}/activity`);
  assert.ok([401, 403, 404].includes(anon.status), `anon ${anon.status}`);
  const other = await fetch(`${api}/shares/${id}/activity`, {
    headers: { cookie: bob },
  });
  assert.ok([403, 404].includes(other.status), `bob ${other.status}`);
});

test("5 wrong passwords auto-revoke the share", async () => {
  const { id } = await newShare({ password: "correct-horse" });
  for (let i = 0; i < 5; i++) {
    const r = await post(`shares/${id}/token`, "", { password: "nope" });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error, "wrong_password");
  }
  const r = await post(`shares/${id}/token`, "", { password: "correct-horse" });
  assert.equal(r.status, 404);
  const body = await r.json();
  assert.equal(body.error, "share_removed");
  assert.equal(body.message, "Auto-revoked: too many wrong passwords");
});

test("burst of 20 downloads from 5 IPs auto-revokes", async () => {
  const { id, fileId } = await newShare();
  for (let i = 0; i < 20; i++)
    await download(id, fileId, { "x-forwarded-for": `10.0.0.${i % 5}` });
  const r = await fetch(`${api}/shares/${id}/files/${fileId}`);
  assert.equal(r.status, 404);
  const body = await r.json();
  assert.equal(body.error, "share_removed");
  assert.equal(body.message, "Auto-revoked: unusual download activity");
});

test("share payload includes safety data without owner email", async () => {
  const { id } = await newShare();
  await prisma.share.update({
    where: { id },
    data: { expiration: new Date(0) },
  });
  const token = await post(`shares/${id}/token`, "", {});
  const cookie = token.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  const r = await fetch(`${api}/shares/${id}`, { headers: { cookie } });
  assert.equal(r.status, 200);
  const text = await r.text();
  const body = JSON.parse(text);
  assert.equal(body.safety.expiresAt, null);
  assert.equal(body.safety.hasPassword, false);
  assert.equal(body.safety.maxViews, null);
  assert.ok(Array.isArray(body.safety.blockedExtensions));
  assert.ok(body.safety.sharedBy);
  assert.equal(
    text.includes("@example.test") && text.includes('"email"'),
    false,
  );
});
