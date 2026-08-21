// Small client for the integration suite. Everything talks to a running
// instance over HTTP, so this only needs a cookie jar and raw body support.

export const BASE_URL =
  process.env.INTEGRATION_BASE_URL ?? "http://localhost:3001/api";

export type Jar = Record<string, string>;

export type ApiResult<T = any> = {
  status: number;
  data: T;
  body: Buffer;
};

const cookieHeader = (jar: Jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

const collectCookies = (res: Response, jar: Jar) => {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
};

export async function api<T = any>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    jar?: Jar;
    raw?: Buffer;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, jar, raw, headers = {} } = opts;

  const finalHeaders: Record<string, string> = { ...headers };
  if (jar) finalHeaders.Cookie = cookieHeader(jar);
  if (raw) finalHeaders["Content-Type"] = "application/octet-stream";
  else if (body !== undefined) finalHeaders["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    // an S3 download answers with a redirect to a presigned url, following it
    // would drop the assertion we care about
    redirect: "manual",
  });

  if (jar) collectCookies(res, jar);

  // read as bytes, downloads are arbitrary binary and decoding as text first
  // would corrupt the checksum comparisons
  const buffer = Buffer.from(await res.arrayBuffer());
  let data: any;
  try {
    data = buffer.length ? JSON.parse(buffer.toString("utf8")) : undefined;
  } catch {
    data = buffer.toString("utf8");
  }

  return { status: res.status, data, body: buffer };
}

export const TEST_PASSWORD = "IntegrationTest123!";

// One shared prefix per run so leftovers are always attributable and the
// cleanup filters cannot touch anything the user actually cares about.
export const RUN_ID = `it${Date.now().toString(36)}`;

let userCount = 0;

export async function signUp(label: string) {
  const jar: Jar = {};
  const suffix = `${RUN_ID}-${label}-${userCount++}`;
  const email = `${suffix}@integration.invalid`;
  const res = await api("/auth/signUp", {
    method: "POST",
    jar,
    body: {
      email,
      username: suffix.replace(/-/g, "_"),
      password: TEST_PASSWORD,
    },
  });

  if (res.status === 429) throw rateLimited("signUp");
  if (res.status !== 201) {
    throw new Error(
      `signUp failed for ${email}: ${res.status} ${res.body.toString("utf8")}`,
    );
  }
  return { jar, email, username: suffix.replace(/-/g, "_") };
}

// The auth endpoints allow 20 calls per 5 minutes per IP. Running the suite
// several times in a row runs into it, which otherwise shows up as a pile of
// unrelated looking assertion failures.
const rateLimited = (what: string) =>
  new Error(
    `${what} was rate limited (429). The auth endpoints allow 20 calls per ` +
      `5 minutes per IP and this suite creates a handful of accounts per run. ` +
      `Wait for the window to pass and run it again.`,
  );

export async function signIn(email: string, password = TEST_PASSWORD) {
  const jar: Jar = {};
  const res = await api("/auth/signIn", {
    method: "POST",
    jar,
    body: { email, password },
  });
  if (res.status === 429) throw rateLimited("signIn");
  return { jar, res };
}

export async function deleteAccount(jar: Jar) {
  await api("/users/me", { method: "DELETE", jar }).catch(() => undefined);
}

export async function removeShare(jar: Jar, shareId: string) {
  await api(`/shares/${shareId}`, { method: "DELETE", jar }).catch(
    () => undefined,
  );
}

// create -> upload one file -> complete, the flow the upload page performs
export async function createShareWithFile(
  jar: Jar,
  shareId: string,
  content: Buffer,
  options: { security?: Record<string, unknown>; fileName?: string } = {},
) {
  const fileId = crypto.randomUUID();
  const { security = {}, fileName = "payload.bin" } = options;

  const created = await api("/shares", {
    method: "POST",
    jar,
    body: { id: shareId, expiration: "1-days", security, recipients: [] },
  });
  if (created.status !== 201) {
    throw new Error(
      `create share ${shareId} failed: ${created.status} ${created.body.toString("utf8")}`,
    );
  }

  const uploaded = await api(
    `/shares/${shareId}/files?id=${fileId}&name=${encodeURIComponent(fileName)}&chunkIndex=0&totalChunks=1`,
    { method: "POST", jar, raw: content },
  );
  if (uploaded.status !== 201) {
    throw new Error(
      `upload to ${shareId} failed: ${uploaded.status} ${uploaded.body.toString("utf8")}`,
    );
  }

  const completed = await api(`/shares/${shareId}/complete`, {
    method: "POST",
    jar,
  });
  if (completed.status !== 202) {
    throw new Error(
      `complete ${shareId} failed: ${completed.status} ${completed.body.toString("utf8")}`,
    );
  }

  return { shareId, fileId };
}

export async function getConfig(key: string) {
  const res = await api<{ key: string; value: string }[]>("/configs");
  const entry = Array.isArray(res.data)
    ? res.data.find((c) => c.key === key)
    : undefined;
  return entry?.value;
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Polls the admin share list until the antivirus verdict lands.
export async function waitForScanStatus(
  adminJar: Jar,
  shareId: string,
  timeoutMs = 60_000,
) {
  const deadline = Date.now() + timeoutMs;
  let last: string | undefined;

  while (Date.now() < deadline) {
    const res = await api<any[]>("/shares/all", { jar: adminJar });
    if (res.status !== 200) {
      throw new Error(`/shares/all failed: ${res.status}`);
    }
    const share = res.data.find((s) => s.id === shareId);
    // clamav deletes an infected share's files but keeps the row
    if (!share) return "DELETED";
    last = share.scanStatus;
    if (last && last !== "PENDING") return last;
    await sleep(2000);
  }

  return last ?? "PENDING";
}
