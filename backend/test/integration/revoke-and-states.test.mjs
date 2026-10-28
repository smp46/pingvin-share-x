// Run only against a session-owned database and backend; never shared data.
// RV_TEST_API=http://127.0.0.1:3305/api DATABASE_URL=file:/tmp/.../pingvin-share.db node --test test/integration/revoke-and-states.test.mjs
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
  const email = `task5-${label}-${randomUUID()}@example.test`;
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
async function newShare() {
  const created = await post("shares", alice, {
    expiration: "1-day",
    recipients: [],
    security: {},
  });
  assert.equal(created.status, 201);
  const share = await created.json();
  const uploaded = await post(
    `shares/${share.id}/files?name=t5.txt&chunkIndex=0&totalChunks=1`,
    alice,
    "task 5 fixture\n",
    true,
  );
  assert.equal(uploaded.status, 201);
  const file = await uploaded.json();
  assert.equal((await post(`shares/${share.id}/complete`, alice)).status, 202);
  return { id: share.id, fileId: file.id };
}
async function viewShareStatus(id) {
  const token = await post(`shares/${id}/token`, "", {});
  assert.equal(token.status, 200);
  const cookie = token.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return (await fetch(`${api}/shares/${id}`, { headers: { cookie } })).status;
}
async function expectError(path, status, error, message) {
  const response = await fetch(`${api}/${path}`);
  assert.equal(response.status, status, path);
  const body = await response.json();
  assert.equal(body.error, error, path);
  if (message) assert.equal(body.message, message, path);
}

test("owner revoke makes share, file and zip routes return share_removed", async () => {
  const { id, fileId } = await newShare();
  assert.equal(
    (await fetch(`${api}/shares/${id}/files/${fileId}`)).status,
    200,
  );
  assert.equal((await post(`shares/${id}/revoke`, alice)).status, 200);
  for (const path of [
    `shares/${id}`,
    `shares/${id}/files/${fileId}`,
    `shares/${id}/files/zip`,
  ])
    await expectError(path, 404, "share_removed", "Revoked by owner");
});

test("token route on a revoked share returns share_removed", async () => {
  const { id } = await newShare();
  await post(`shares/${id}/revoke`, alice);
  const response = await post(`shares/${id}/token`, "", {});
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "share_removed");
});

test("expired share returns share_expired on share and file routes", async () => {
  const { id, fileId } = await newShare();
  await prisma.share.update({
    where: { id },
    data: { expiration: new Date(Date.now() - 60_000) },
  });
  await expectError(`shares/${id}`, 404, "share_expired");
  await expectError(`shares/${id}/files/${fileId}`, 404, "share_expired");
  const token = await post(`shares/${id}/token`, "", {});
  assert.equal((await token.json()).error, "share_expired");
});

test("never-expiring share (unix 0) is not treated as expired", async () => {
  const { id } = await newShare();
  await prisma.share.update({
    where: { id },
    data: { expiration: new Date(0) },
  });
  assert.equal(await viewShareStatus(id), 200);
});

test("unknown id returns share_not_found", async () => {
  const id = "A".repeat(22);
  await expectError(`shares/${id}`, 404, "share_not_found");
  await expectError(`shares/${id}/files/x`, 404, "share_not_found");
});

test("another user cannot revoke the share and it stays usable", async () => {
  const { id, fileId } = await newShare();
  const response = await post(`shares/${id}/revoke`, bob);
  assert.ok([403, 404].includes(response.status), `got ${response.status}`);
  assert.equal(await viewShareStatus(id), 200);
  assert.equal(
    (await fetch(`${api}/shares/${id}/files/${fileId}`)).status,
    200,
  );
});
