import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  AccessEventLite,
  TripwireConfig,
} from "../../src/utils/tripwire.util.ts";

// Catch bypasses through case, double extensions, padding, or hidden names.
for (const name of [
  "evil.html",
  "evil.HTML",
  "a.pdf.exe",
  "a.html.",
  "a.html ",
  "x.svg",
  "run.SH",
  ".htaccess",
  " .hidden.txt ",
  "a.html.pdf",
  " a.HtMl. . ",
  "run.bat",
  "run.cmd",
  "run.ps1",
  "run.js",
  "run.htm",
  "run.xhtml",
  "run.msi",
  "run.scr",
  "run.jar",
  "run.apk",
  "run.dll",
]) {
  test(`blocks unsafe filename ${JSON.stringify(name)}`, async () => {
    const { isBlockedFileName } = await import(
      "../../src/utils/fileNamePolicy.util.ts"
    );
    assert.equal(isBlockedFileName(name), true);
  });
}

for (const name of [
  "report.pdf",
  "photo.jpg",
  "notes.txt",
  "archive.zip",
  "README",
  "  report.pdf. ",
  "html",
  "report.htmlish",
  "report.pdf.txt",
]) {
  test(`allows safe filename ${JSON.stringify(name)}`, async () => {
    const { isBlockedFileName } = await import(
      "../../src/utils/fileNamePolicy.util.ts"
    );
    assert.equal(isBlockedFileName(name), false);
  });
}

test("generated share ids are URL-safe, 22 characters, and unique across 1000 calls", async () => {
  const { generateShareId } = await import("../../src/utils/shareId.util.ts");
  const ids = Array.from({ length: 1000 }, () => generateShareId());
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(new Set(ids).size, 1000);
});

const now = new Date("2026-10-28T12:00:00Z");
const cfg: TripwireConfig = {
  passwordLimit: 5,
  downloadLimit: 20,
  distinctIps: 5,
  windowMinutes: 10,
};

function events(
  type: AccessEventLite["type"],
  count: number,
  distinctIps = 1,
  createdAt = "2026-10-28T11:59:00Z",
): AccessEventLite[] {
  return Array.from({ length: count }, (_, index) => ({
    type,
    ipHash: `hash-${index % distinctIps}`,
    createdAt: new Date(createdAt),
  }));
}

// Each fixture catches a wrong threshold, event type, window, or IP population.
const tripwireCases: {
  name: string;
  events: AccessEventLite[];
  cfg?: TripwireConfig;
  want: string | null;
}[] = [
  {
    name: "revokes on five wrong passwords",
    events: events("bad_password", 5),
    want: "Auto-revoked: too many wrong passwords",
  },
  {
    name: "allows four wrong passwords",
    events: events("bad_password", 4),
    want: null,
  },
  {
    name: "excludes an eleven-minute-old wrong password",
    events: [
      ...events("bad_password", 4),
      ...events("bad_password", 1, 1, "2026-10-28T11:49:00Z"),
    ],
    want: null,
  },
  {
    name: "revokes on twenty downloads from five IPs",
    events: events("download", 20, 5),
    want: "Auto-revoked: unusual download activity",
  },
  {
    name: "allows twenty downloads from four IPs",
    events: events("download", 20, 4),
    want: null,
  },
  {
    name: "allows nineteen downloads from five IPs",
    events: events("download", 19, 5),
    want: null,
  },
  { name: "allows an empty history", events: [], want: null },
  {
    name: "ignores views for password and download thresholds",
    events: events("view", 30, 10),
    want: null,
  },
  {
    name: "counts distinct IPs from downloads only",
    events: [
      ...events("download", 20, 4),
      ...events("view", 1).map((event) => ({
        ...event,
        ipHash: "view-only-ip",
      })),
    ],
    want: null,
  },
  {
    name: "excludes stale downloads from the count",
    events: [
      ...events("download", 19, 5),
      ...events("download", 1, 1, "2026-10-28T11:49:00Z"),
    ],
    want: null,
  },
  {
    name: "includes events exactly at the window boundary",
    events: events("bad_password", 5, 1, "2026-10-28T11:50:00Z"),
    want: "Auto-revoked: too many wrong passwords",
  },
  {
    name: "uses the configured password threshold",
    events: events("bad_password", 3),
    cfg: { ...cfg, passwordLimit: 3 },
    want: "Auto-revoked: too many wrong passwords",
  },
  {
    name: "uses the configured download and IP thresholds",
    events: events("download", 3, 2),
    cfg: { ...cfg, downloadLimit: 3, distinctIps: 2 },
    want: "Auto-revoked: unusual download activity",
  },
  {
    name: "uses the configured window",
    events: events("bad_password", 5, 1, "2026-10-28T11:57:00Z"),
    cfg: { ...cfg, windowMinutes: 2 },
    want: null,
  },
];

for (const fixture of tripwireCases) {
  test(`tripwire ${fixture.name}`, async () => {
    const { evaluateTripwire } = await import(
      "../../src/utils/tripwire.util.ts"
    );
    assert.equal(
      evaluateTripwire(fixture.events, now, fixture.cfg ?? cfg),
      fixture.want,
    );
  });
}

// Catch fallback overriding an explicit quota, or missing unlimited semantics.
const quotaCases = [
  {
    name: "uses the per-user quota",
    user: { storageQuotaLimit: "1000" },
    defaultQuota: 50,
    want: 1000,
  },
  {
    name: "falls back for a null user quota",
    user: { storageQuotaLimit: null },
    defaultQuota: 50,
    want: 50,
  },
  {
    name: "falls back for a null user",
    user: null,
    defaultQuota: 50,
    want: 50,
  },
  {
    name: "is unlimited when both quota sources are unset",
    user: { storageQuotaLimit: null },
    defaultQuota: 0,
    want: null,
  },
  {
    name: "falls back for an undefined user",
    user: undefined,
    defaultQuota: 50,
    want: 50,
  },
  {
    name: "falls back for an omitted per-user quota",
    user: {},
    defaultQuota: 50,
    want: 50,
  },
  {
    name: "preserves an explicit zero per-user quota",
    user: { storageQuotaLimit: "0" },
    defaultQuota: 50,
    want: 0,
  },
  {
    name: "is unlimited for a negative default",
    user: null,
    defaultQuota: -1,
    want: null,
  },
];

for (const fixture of quotaCases) {
  test(`quota ${fixture.name}`, async () => {
    const { resolveStorageQuota } = await import(
      "../../src/utils/storageQuota.util.ts"
    );
    assert.equal(
      resolveStorageQuota(fixture.user, fixture.defaultQuota),
      fixture.want,
    );
  });
}
