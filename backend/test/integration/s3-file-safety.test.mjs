// Real services + isolated Prisma; only the external S3 wire client is replaced.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { after, test } from "node:test";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
const require = createRequire(import.meta.url);
const { S3FileService } = require("../../dist/src/file/s3.service.js");
const { FileService } = require("../../dist/src/file/file.service.js");
const { FileController } = require("../../dist/src/file/file.controller.js");
assert.ok(process.env.DATABASE_URL?.includes("/tmp/"), "isolated DB required");
const prisma = new PrismaClient();
after(() => prisma.$disconnect());
const config = {
  get(key) {
    return {
      "share.maxSize": 10000000,
      "share.defaultStorageQuota": 50000000,
      "s3.bucketName": "fixture",
      "s3.bucketPath": "",
      "s3.enabled": true,
    }[key];
  },
};
const i18n = { t: (key) => key };
async function fixture(size = "0", userQuota = null) {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      username: randomUUID(),
      storageQuotaLimit: userQuota,
    },
  });
  const share = await prisma.share.create({
    data: {
      expiration: new Date(0),
      creatorId: user.id,
      storageProvider: "S3",
      files: { create: { name: "old.txt", size } },
    },
    include: { files: true },
  });
  const s3 = new S3FileService(prisma, config, i18n);
  let writes = 0;
  s3.getS3Instance = () => ({
    send: async (command) => {
      switch (command.constructor.name) {
        case "CreateMultipartUploadCommand":
          return { UploadId: "fixture-upload" };
        case "UploadPartCommand":
          writes += command.input.Body.byteLength;
          return { ETag: "fixture-etag" };
        case "CompleteMultipartUploadCommand":
          return {};
        case "AbortMultipartUploadCommand":
          return {};
        case "HeadObjectCommand":
          return { ContentLength: writes };
        case "GetObjectCommand": {
          // Correct ranged total differs from ContentLength; do not derive expected HTTP metadata from the service.
          if (command.input.Range === "bytes=999-1000") {
            const error = new Error("InvalidRange");
            error.name = "InvalidRange";
            error.$metadata = { httpStatusCode: 416 };
            throw error;
          }
          if (command.input.Range)
            return {
              Body: Readable.from(["ello"]),
              ContentLength: 4,
              ContentRange: "bytes 1-4/10",
              LastModified: new Date(),
            };
          return {
            Body: Readable.from(["helloworld"]),
            ContentLength: 10,
            LastModified: new Date(),
          };
        }
        default:
          throw new Error(`Unexpected S3 command: ${command.constructor.name}`);
      }
    },
  });
  return { s3, share, user, uploadedBytes: () => writes };
}

// Omitting S3 maxSize lets chunks bypass the system limit even when local works.
test("S3 enforces aggregate share size before uploading any disallowed bytes", async () => {
  const f = await fixture("9999998");
  await assert.rejects(
    f.s3.create(
      Buffer.from("four").toString("base64"),
      { index: 0, total: 1 },
      { name: "new.txt" },
      f.share.id,
    ),
    (error) => error.getStatus?.() === 413,
  );
  assert.equal(f.uploadedBytes(), 0);
  assert.equal(await prisma.file.count({ where: { shareId: f.share.id } }), 1);
});

test("S3 accumulates staged chunks when enforcing max share size", async () => {
  const f = await fixture("0");
  const file = await f.s3.create(
    Buffer.alloc(10000000).toString("base64"),
    { index: 0, total: 2 },
    { name: "large.txt" },
    f.share.id,
  );
  await assert.rejects(
    f.s3.create(
      Buffer.from("x").toString("base64"),
      { index: 1, total: 2 },
      file,
      f.share.id,
    ),
    (error) => error.getStatus?.() === 413,
  );
  assert.equal(f.uploadedBytes(), 10000000);
});

// Removing fallback or wrapping the expected 4xx in a generic Error fails this.
test("S3 fallback quota uses active owner storage and preserves client error", async () => {
  const f = await fixture("50000000");
  // Separate share keeps max-share-size out of this quota assertion.
  const share = await prisma.share.create({
    data: {
      expiration: new Date(0),
      creatorId: f.user.id,
      storageProvider: "S3",
    },
  });
  await assert.rejects(
    f.s3.create(
      "eA==",
      { index: 0, total: 1 },
      { name: "small.txt" },
      share.id,
    ),
    (error) =>
      error.getStatus?.() === 400 && /storageQuotaExceeded/.test(error.message),
  );
  assert.equal(f.uploadedBytes(), 0);
});

test("S3 explicit zero quota is enforced", async () => {
  const f = await fixture("0", "0");
  await assert.rejects(
    f.s3.create(
      "eA==",
      { index: 0, total: 1 },
      { name: "small.txt" },
      f.share.id,
    ),
    (error) => error.getStatus?.() === 400,
  );
  assert.equal(f.uploadedBytes(), 0);
});

// Keeping redirect branch bypasses CSP on bytes; missing range metadata corrupts 206.
test("S3 controller streams bytes with total-size range metadata and strict headers", async () => {
  const f = await fixture("10");
  const files = new FileService(prisma, null, f.s3, config, null, i18n, null);
  // Presigning is an external operation too; old redirect branch must fail by HTTP status.
  f.s3.getPreSignedDownloadUrl = async () => "https://fixture.invalid/object";
  const controller = new FileController(files);
  const response = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(headers) {
      Object.assign(this.headers, headers);
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
  };
  const streamed = await controller.getFile(
    { headers: { range: "bytes=1-4" } },
    response,
    f.share.id,
    f.share.files[0].id,
    "false",
  );
  assert.equal(response.statusCode, 206);
  assert.equal(response.headers["Content-Range"], "bytes 1-4/10");
  assert.equal(response.headers["Content-Length"], 4);
  assert.equal(response.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(
    response.headers["Content-Security-Policy"],
    "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
  );
  let bytes = "";
  for await (const chunk of streamed.getStream()) bytes += chunk;
  assert.equal(bytes, "ello");
});

test("S3 unsatisfiable ranges return metadata for 416 rather than provider error", async () => {
  const f = await fixture("10");
  const result = await f.s3.get(
    f.share.id,
    f.share.files[0].id,
    "bytes=999-1000",
  );
  assert.equal(result.isRangeNotSatisfiable, true);
  assert.equal(result.metaData.size, "10");
  assert.equal(result.file, undefined);
});
