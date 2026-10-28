// Run against an isolated local backend with a session-owned registered user:
// RV_TEST_API=http://127.0.0.1:3302/api RV_TEST_CREDENTIALS=/tmp/.../registration.json node --test test/integration/server-generated-share-id.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, test } from "node:test";

const api = process.env.RV_TEST_API;
assert.ok(api, "RV_TEST_API must name an isolated test backend");
let cookie;
before(async () => {
  const credentials = JSON.parse(
    await readFile(process.env.RV_TEST_CREDENTIALS, "utf8"),
  );
  const response = await fetch(`${api}/auth/signIn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });
  assert.equal(response.status, 200, "session-owned test user can sign in");
  cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
});
async function post(
  path,
  body,
  session = cookie,
  contentType = "application/json",
) {
  return fetch(`${api}/${path}`, {
    method: "POST",
    headers: { cookie: session, "content-type": contentType },
    body: contentType === "application/json" ? JSON.stringify(body) : body,
  });
}
const payload = { expiration: "1-day", security: {}, recipients: [] };

// Removing the server override would expose the caller's id and fail this contract.
test("valid client ids are replaced with fresh server ids on every creation", async () => {
  const supplied = `task3-${Date.now()}`;
  const ids = [];
  for (let index = 0; index < 2; index++) {
    const response = await post("shares", { ...payload, id: supplied });
    assert.equal(response.status, 201);
    const share = await response.json();
    assert.match(share.id, /^[A-Za-z0-9_-]{22}$/);
    assert.notEqual(share.id, supplied);
    ids.push(share.id);
  }
  assert.notEqual(ids[0], ids[1]);
});

// Removing IsOptional would reject the UI's id-free request.
test("normal uploads complete using the id returned for an id-free request", async () => {
  await uploadAndComplete(cookie);
});

// Removing pattern or length validation would allow malformed legacy input.
test("malformed supplied ids still fail validation", async () => {
  for (const id of ["a/b", "ab", "x".repeat(51)]) {
    const response = await post("shares", { ...payload, id });
    assert.equal(response.status, 400);
  }
});

test("anonymous reverse-share uploads complete using the generated response id", async () => {
  const response = await post("reverseShares", {
    sendEmailNotification: false,
    maxShareSize: "1000000",
    shareExpiration: "1-day",
    maxUseCount: 2,
    simplified: false,
    publicAccess: true,
  });
  assert.equal(response.status, 201);
  const { token } = await response.json();
  const share = await uploadAndComplete(`reverse_share_token=${token}`);
  const owned = await fetch(`${api}/reverseShares`, { headers: { cookie } });
  const tokens = await owned.json();
  assert.ok(
    tokens.some(
      (value) =>
        value.token === token &&
        value.shares.some((value) => value.id === share.id),
    ),
    "completed upload remains linked to the reverse-share owner",
  );
});

async function uploadAndComplete(session) {
  const response = await post("shares", payload, session);
  assert.equal(response.status, 201);
  const share = await response.json();
  assert.match(share.id, /^[A-Za-z0-9_-]{22}$/);
  const content = "Task 3 generated-id integration fixture\n";
  const uploaded = await post(
    `shares/${share.id}/files?name=task3.txt&chunkIndex=0&totalChunks=1`,
    content,
    session,
    "application/octet-stream",
  );
  assert.equal(uploaded.status, 201);
  const file = await uploaded.json();
  const completed = await post(`shares/${share.id}/complete`, {}, session);
  assert.equal(completed.status, 202);
  const result = await completed.json();
  assert.equal(result.id, share.id);
  const download = await fetch(`${api}/shares/${share.id}/files/${file.id}`);
  assert.equal(download.status, 200);
  assert.equal(await download.text(), content);
  return result;
}
