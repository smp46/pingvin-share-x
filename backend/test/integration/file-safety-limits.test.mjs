// Run only against a session-owned database and backend; never shared data.
// RV_TEST_API=http://127.0.0.1:3304/api DATABASE_URL=file:/tmp/.../pingvin-share.db RV_TEST_DATA=/tmp/... node --test test/integration/file-safety-limits.test.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import argon from "argon2";

const api = process.env.RV_TEST_API;
const dataDirectory = process.env.RV_TEST_DATA;
assert.ok(
  api && dataDirectory && process.env.DATABASE_URL,
  "explicit isolated runtime required",
);
const prisma = new PrismaClient();
const csp = "sandbox; default-src 'none'; img-src 'self'; media-src 'self'";
let cookie, user;
before(async () => {
  const email = `task4-${randomUUID()}@example.test`;
  const password = randomUUID();
  user = await prisma.user.create({
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
  cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.equal(user.storageQuotaLimit, null);
});
after(async () => prisma.$disconnect());
async function post(path, body, binary = false) {
  return fetch(`${api}/${path}`, {
    method: "POST",
    headers: {
      cookie,
      "content-type": binary ? "application/octet-stream" : "application/json",
    },
    body: binary ? body : JSON.stringify(body),
  });
}
async function newShare(extra = {}) {
  const response = await post("shares", {
    expiration: "1-day",
    recipients: [],
    security: {},
    ...extra,
  });
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}
async function upload(shareId, name, data = "hello task four", suffix = "") {
  return post(
    `shares/${shareId}/files?name=${encodeURIComponent(name)}&chunkIndex=0&totalChunks=1${suffix}`,
    data,
    true,
  );
}
function safeHeaders(response) {
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-security-policy"), csp);
}

// Missing new seeds would misinform the UI and leave later tripwire config undefined.
test("fresh seed exposes effective demo limits, branding, and tripwire configuration", async () => {
  const response = await fetch(`${api}/configs`);
  const configs = await response.json();
  for (const [key, value] of Object.entries({
    "general.appName": "RV Files",
    "share.maxSize": "10000000",
    "share.maxExpiration": "7 days",
    "share.defaultExpiration": "1 day",
    "share.defaultStorageQuota": "50000000",
    "share.tripwirePasswordLimit": "5",
    "share.tripwireDownloadLimit": "20",
    "share.tripwireDistinctIps": "5",
    "share.tripwireWindowMinutes": "10",
  })) {
    const config = configs.find((config) => config.key === key);
    assert.ok(config, `${key} is public configuration`);
    assert.equal(config.value ?? config.defaultValue, value, key);
  }
});

// Removing either upload-init check reopens its ingestion path.
for (const name of ["evil.html", "photo.SVG.png", ".htaccess"]) {
  test(`chunk zero rejects ${name} without writing file metadata`, async () => {
    const share = await newShare();
    const response = await upload(share.id, name);
    assert.equal(response.status, 400);
    assert.match(
      (await response.json()).message,
      /This file type is not allowed/,
    );
    assert.equal(await prisma.file.count({ where: { shareId: share.id } }), 0);
  });
  test(`presigned init rejects ${name}`, async () => {
    const share = await newShare();
    const response = await post(`shares/${share.id}/files/upload-init`, {
      name,
      totalChunks: 1,
    });
    assert.equal(response.status, 400);
    assert.match(
      (await response.json()).message,
      /This file type is not allowed/,
    );
  });
}

test("default quota rejects a non-admin's 60 MB declared share", async () => {
  const response = await post("shares", {
    expiration: "1-day",
    recipients: [],
    security: {},
    size: 60000000,
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /storage quota/);
});

test("10 MB max applies across consecutive chunks of an 11 MB file", async () => {
  const share = await newShare();
  const first = await post(
    `shares/${share.id}/files?name=large.txt&chunkIndex=0&totalChunks=2`,
    Buffer.alloc(10000000, 65),
    true,
  );
  assert.equal(first.status, 201);
  const file = await first.json();
  const second = await post(
    `shares/${share.id}/files?id=${file.id}&name=large.txt&chunkIndex=1&totalChunks=2`,
    Buffer.alloc(1000000, 65),
    true,
  );
  assert.equal(second.status, 413);
  assert.match((await second.json()).message, /Max share size/);
  assert.equal(await prisma.file.count({ where: { shareId: share.id } }), 0);
});

test("local uploads enforce fallback quota against other active shares", async () => {
  const usage = await prisma.share.create({
    data: {
      expiration: new Date(0),
      creatorId: user.id,
      files: { create: { name: "usage.txt", size: "50000000" } },
    },
  });
  try {
    const share = await newShare();
    const response = await upload(share.id, "small.txt");
    assert.equal(response.status, 413);
    assert.match((await response.json()).message, /storage quota/);
    assert.equal(await prisma.file.count({ where: { shareId: share.id } }), 0);
  } finally {
    await prisma.share.delete({ where: { id: usage.id } });
  }
});

test("inline text, range, unsatisfiable range and ZIP responses retain strict headers", async () => {
  const share = await newShare();
  const response = await upload(share.id, "safe.txt");
  assert.equal(response.status, 201);
  const file = await response.json();
  assert.equal((await upload(share.id, "second.txt", "zip fixture")).status, 201);
  assert.equal((await post(`shares/${share.id}/complete`, {})).status, 202);
  const path = `${api}/shares/${share.id}/files/${file.id}?download=false`;
  const text = await fetch(path);
  assert.equal(await text.text(), "hello task four");
  safeHeaders(text);
  assert.match(text.headers.get("content-disposition"), /^inline/);
  const head = await fetch(path, { method: "HEAD" });
  assert.equal(head.status, 200);
  safeHeaders(head);
  const range = await fetch(path, { headers: { range: "bytes=0-3" } });
  assert.equal(range.status, 206);
  assert.equal(await range.text(), "hell");
  assert.equal(range.headers.get("content-range"), "bytes 0-3/15");
  safeHeaders(range);
  const invalid = await fetch(path, { headers: { range: "bytes=99-100" } });
  assert.equal(invalid.status, 416);
  safeHeaders(invalid);
  // Completion schedules ZIP creation asynchronously; wait on the real persisted readiness flag.
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    ready = (await prisma.share.findUnique({ where: { id: share.id } }))
      .isZipReady;
    if (ready) break;
    await setTimeout(20);
  }
  assert.equal(ready, true, "archive finishes building");
  const zip = await fetch(`${api}/shares/${share.id}/files/zip`);
  assert.equal(zip.status, 200);
  assert.equal(Buffer.from(await zip.arrayBuffer()).readUInt32LE(), 0x04034b50);
  safeHeaders(zip);
});

test("existing active files are attachments even when preview is requested", async () => {
  const share = await newShare();
  const file = await prisma.file.create({
    data: { shareId: share.id, name: "legacy.html", size: "5" },
  });
  await mkdir(`${dataDirectory}/uploads/shares/${share.id}`, {
    recursive: true,
  });
  // Old files can predate upload blocking.
  await writeFile(
    `${dataDirectory}/uploads/shares/${share.id}/${file.id}`,
    "hello",
  );
  const response = await fetch(
    `${api}/shares/${share.id}/files/${file.id}?download=false`,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "hello");
  safeHeaders(response);
  assert.match(response.headers.get("content-disposition"), /^attachment/);
});

test("S3 shares select guarded chunks and reject direct completion bypass", async () => {
  const share = await newShare();
  await prisma.share.update({
    where: { id: share.id },
    data: { storageProvider: "S3" },
  });
  const init = await post(`shares/${share.id}/files/upload-init`, {
    name: "safe.txt",
    totalChunks: 1,
  });
  assert.equal(init.status, 201);
  assert.deepEqual(await init.json(), { directToS3: false });
  const complete = await post(`shares/${share.id}/files/upload-complete`, {
    name: "safe.txt",
    uploadId: "old-session",
    parts: [],
  });
  assert.equal(complete.status, 400);
  assert.equal(await prisma.file.count({ where: { shareId: share.id } }), 0);
});
