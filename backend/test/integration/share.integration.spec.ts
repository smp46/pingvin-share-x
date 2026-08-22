import { createHash, randomBytes } from "crypto";
import {
  RUN_ID,
  api,
  createShareWithFile,
  deleteAccount,
  getConfig,
  removeShare,
  signUp,
} from "./helpers/api";

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

describe("uploading and downloading", () => {
  let owner: Awaited<ReturnType<typeof signUp>>;
  const createdShares: string[] = [];

  beforeAll(async () => {
    owner = await signUp("share");
  }, 60_000);

  afterAll(async () => {
    for (const id of createdShares) await removeShare(owner.jar, id);
    if (owner) await deleteAccount(owner.jar);
  });

  it("returns the exact bytes that were uploaded", async () => {
    const content = randomBytes(64 * 1024);
    const shareId = `${RUN_ID}-roundtrip`;
    createdShares.push(shareId);

    const { fileId } = await createShareWithFile(owner.jar, shareId, content);

    const download = await api(`/shares/${shareId}/files/${fileId}`, {
      jar: owner.jar,
    });
    expect(download.status).toBe(200);
    expect(sha256(download.body)).toBe(sha256(content));
  }, 60_000);

  it("lists the share for its owner", async () => {
    const res = await api<any[]>("/shares", { jar: owner.jar });
    expect(res.status).toBe(200);
    expect(res.data.some((s) => s.id === `${RUN_ID}-roundtrip`)).toBe(true);
  });

  it("splits an upload across chunks", async () => {
    const chunkSize = parseInt(
      (await getConfig("share.chunkSize")) ?? "10000000",
      10,
    );
    const shareId = `${RUN_ID}-chunked`;
    createdShares.push(shareId);

    // The server works out the expected chunk index from the bytes already on
    // disk divided by the configured chunk size, so every chunk except the
    // last has to be exactly that size. One full chunk plus a short tail is
    // enough to prove reassembly.
    const content = randomBytes(chunkSize + 1024);
    const total = Math.ceil(content.length / chunkSize);
    const fileId = crypto.randomUUID();

    const created = await api("/shares", {
      method: "POST",
      jar: owner.jar,
      body: { id: shareId, expiration: "1-days", security: {}, recipients: [] },
    });
    expect(created.status).toBe(201);

    for (let i = 0; i < total; i++) {
      const slice = content.subarray(i * chunkSize, (i + 1) * chunkSize);
      const res = await api(
        `/shares/${shareId}/files?id=${fileId}&name=chunked.bin&chunkIndex=${i}&totalChunks=${total}`,
        { method: "POST", jar: owner.jar, raw: slice },
      );
      expect(res.status).toBe(201);
    }

    expect(
      (await api(`/shares/${shareId}/complete`, { method: "POST", jar: owner.jar }))
        .status,
    ).toBe(202);

    const download = await api(`/shares/${shareId}/files/${fileId}`, {
      jar: owner.jar,
    });
    expect(download.status).toBe(200);
    expect(download.body.length).toBe(content.length);
    expect(sha256(download.body)).toBe(sha256(content));
  }, 120_000);

  it("lets a stranger download a public share", async () => {
    const content = randomBytes(2048);
    const shareId = `${RUN_ID}-public`;
    createdShares.push(shareId);

    const { fileId } = await createShareWithFile(owner.jar, shareId, content);

    // no session and no share token, the plain "click the link" case
    const download = await api(`/shares/${shareId}/files/${fileId}`);
    expect(download.status).toBe(200);
    expect(sha256(download.body)).toBe(sha256(content));
  }, 60_000);

  it("reports an unknown share as missing", async () => {
    const res = await api(`/shares/${RUN_ID}-does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe("password protected shares", () => {
  let owner: Awaited<ReturnType<typeof signUp>>;
  const shareId = `${RUN_ID}-secret`;
  const password = "SharePassword123!";
  let fileId: string;
  let content: Buffer;

  beforeAll(async () => {
    owner = await signUp("pw");
    content = randomBytes(1024);
    ({ fileId } = await createShareWithFile(owner.jar, shareId, content, {
      security: { password },
    }));
  }, 60_000);

  afterAll(async () => {
    if (owner) {
      await removeShare(owner.jar, shareId);
      await deleteAccount(owner.jar);
    }
  });

  it("blocks a download without the password", async () => {
    const res = await api(`/shares/${shareId}/files/${fileId}`);
    expect(res.status).toBe(403);
  });

  it("rejects the wrong password", async () => {
    const res = await api(`/shares/${shareId}/token`, {
      method: "POST",
      jar: {},
      body: { password: "wrong-password" },
    });
    expect(res.status).toBe(403);
  });

  it("hands over the file once the password checks out", async () => {
    const jar = {};
    const token = await api(`/shares/${shareId}/token`, {
      method: "POST",
      jar,
      body: { password },
    });
    expect(token.status).toBe(200);

    const download = await api(`/shares/${shareId}/files/${fileId}`, { jar });
    expect(download.status).toBe(200);
    expect(sha256(download.body)).toBe(sha256(content));
  }, 60_000);
});

describe("anonymous uploads", () => {
  it("follows the allowUnauthenticatedShares setting", async () => {
    const allowed = (await getConfig("security.allowUnauthenticatedShares")) === "true";
    const shareId = `${RUN_ID}-anon`;

    const res = await api("/shares", {
      method: "POST",
      body: { id: shareId, expiration: "1-days", security: {}, recipients: [] },
    });

    if (allowed) {
      expect(res.status).toBe(201);
      await api(`/shares/${shareId}`, { method: "DELETE" });
    } else {
      expect(res.status).toBe(403);
    }
  }, 60_000);
});
