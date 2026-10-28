# PS2 File-Sharing Service — Design (fork of Pingvin Share X)

Date: 2026-10-28 · Build window: 3–4 hours today · Team stack comfort: HTML/CSS/JS/TS, Node.

## 1. Intent

Mini-hackathon problem statement PS2: owners upload files and share them via links that can
expire or be revoked; nothing uploaded may harm the service or the people who open it.
Judged on 10 questions × 5 marks (users/scope, file rules, architecture/flow, storage &
restart survival, unguessable links & access enforcement, end-to-end flow, malicious-file
safety, server-enforced limits, abuse/access control, deployed & runnable/understandable).

**Why fork:** no tech rules; 3–4 hours is too short to build and harden everything from
scratch. We fork **smp46/pingvin-share-x** (BSD-2, active, v2.1.0 released 2026-10-25), which
already has owner login, per-user quota, size limits, expiring shares, max-views, password
links, admin "remove" with reason, attachment + nosniff downloads, ClamAV hook, SQLite
metadata. We make small, targeted changes to close the gaps vs. the brief and the rubric, and
we build documentation so the team can explain every decision.

**Success:** a live URL where a judge can register, upload, share, download, see counts,
revoke/delete, and see clear messages; a README answering all 10 rubric questions; a scripted
"attack demo" that shows each abuse attempt being blocked.

## 2. Scope

**Variant:** secure document vault (bonus), in the lightweight form that fits the time:
password-protected links (exists), server-generated unguessable links, download audit/count,
revocation, **tripwire auto-revoke**, and a recipient-facing **safety card**. Client-side
(E2E) encryption is a non-goal (stretch only).

**Distinguishing features:** (1) safety card on the download page, (2) tripwire auto-revoke.

**Users / roles**
- Owner: registers + logs in; uploads; creates shares; sees dashboard ("My shares"); revokes,
  expires, deletes.
- Recipient: anyone with the link (no account); may need the link password.
- Admin: the seeded first account; sets global limits. (Exists in Pingvin.)

**Out of scope:** reverse shares (leave as-is, not demoed), email/SMTP, OIDC/LDAP, i18n of new
strings beyond English, E2E encryption, mobile app.

## 3. Changes to make (the actual build list)

Code locations below are from reading the fork at commit HEAD on 2026-10-28.

1. **Unguessable share IDs (rubric 5).** Today the client proposes the share ID and the server
   accepts any `^[a-zA-Z0-9_-]*$` of length 3–50 (`backend/src/share/dto/createShare.dto.ts`);
   default `shareIdLength` is 8. Change: the **server** generates the ID itself with
   `crypto.randomBytes(16).toString("base64url")` (128 bits, 22 chars) on create and ignores /
   rejects client-supplied IDs. Hide or disable the "custom link" field in the create-share
   modal (`frontend/src/components/upload/modals/showCreateUploadModal.tsx`). Keep the
   `isShareIdAvailable` route harmless (or remove it from the UI).
2. **Download count (must-have).** Pingvin counts page *views* (`Share.views`,
   `handleViewCount` in `share.service.ts`). Add `downloads Int @default(0)` to `Share`
   (Prisma migration) and increment it atomically in the file download path
   (`file.controller.ts` `GET :fileId` and `GET zip`) only for non-owner downloads (builder's
   call whether owner downloads count; document the choice). Show "Downloads" as a column in
   the My Shares dashboard next to views.
3. **Revoke distinct from expire and delete (must-have).** Existing: owner `POST /shares/:id/expire`
   sets expiration to now; `DELETE /shares/:id` deletes; `removedReason` is admin-only and
   already makes `getShare` throw `share_removed`. Add owner **Revoke** action that sets
   `removedReason = "Revoked by owner"` (owner-guarded, reversible not required), plus a
   Revoke button in My Shares. *(Builder-check call:)* keep Pingvin's existing quota rule —
   `getUserActiveStorageUsage` (`backend/src/utils/storageQuota.util.ts`) only counts active
   shares, so revoking or expiring a share **frees** that quota immediately. Files stay on disk
   until Pingvin's cleanup job or owner Delete. Document this in the README; don't change the util.
4. **Clear recipient messages (must-have).** The share page must show distinct, human messages
   for: *not found*, *expired*, *revoked*, *view limit reached*, *wrong password*. *(Call:)* no
   new max-downloads limit — the existing `maxViews` limit stays as the only usage cap and the
   new `downloads` counter is display-only; refresh-burns-a-view behaviour is left as is. Check
   the existing frontend error handling for `share_removed`, `share_max_views_exceeded`, expiry,
   and fill gaps. Note tension with "don't leak existence": unknown IDs are unguessable
   (128-bit), so distinct messages for real links are acceptable; say this in the README.
5. **Limits configured for the demo (rubric 2, 8).** *(Calls:)*
   - Edit defaults in `backend/prisma/seed/config.seed.ts`: `maxSize` **10 MB per share**
     (Pingvin's unit is the share), `maxExpiration` **7 days** (currently `0 days` = unlimited),
     `defaultExpiration` **1 day**.
   - Add a new config key `share.defaultStorageQuota` = **50 MB**, used as the fallback in
     `local.service.ts` (and `s3.service.ts`) when `user.storageQuotaLimit` is null — so every
     user, including admin and existing accounts, has a quota.
   - Seed defaults only apply to a fresh DB: the **final deploy uses a fresh Railway volume**
     (wipe after the vanilla smoke-test deploy; no real data to keep).
   - Enforcement stays server-side per chunk. Known weakness: quota check is read-then-write
     (not atomic) — document it, fix only if time remains.
6. **File type rules (rubric 2, 7) — required, not optional.**
   - Server-side **blocked-extension list** on upload-init (`.exe .bat .cmd .sh .ps1 .js .html
     .htm .svg .xhtml .msi .scr .jar .apk .dll`), case-insensitive, checking every extension in
     the name (catches `a.pdf.exe`). README presents it as defence in depth: renaming can bypass
     it, which is why the serving rules below are the real protection.
   - Serving: upstream already sends attachment + `nosniff` + `CSP: sandbox` for non-passive
     types. *(Call:)* keep inline preview for passive images/text, but add
     `Content-Security-Policy: sandbox; default-src 'none'; img-src 'self'` to **all** file
     responses including inline ones.
7. **Access events (now required — powers the tripwire and the activity log).** New Prisma
   model `AccessEvent` (id, shareId, type: `view` | `download` | `bad_password`, ipHash =
   sha256(ip + server secret), userAgent, createdAt). Written on share view, file/zip download
   and failed share-password attempts (`POST /shares/:id/token`). Owner sees a per-share
   activity list ("downloaded 3 min ago, Chrome") in My Shares. Requires `TRUST_PROXY=true` on
   Railway so the real client IP is used.
8. **Tripwire auto-revoke (distinguishing feature #2, rubric 9).** Checked server-side right
   after an access event is written:
   - **Password brute force:** ≥ 5 `bad_password` events for one share within 10 minutes →
     set `removedReason = "Auto-revoked: too many wrong passwords"`.
   - **Download burst:** ≥ 20 `download` events from ≥ 5 distinct ipHashes within 10 minutes →
     `removedReason = "Auto-revoked: unusual download activity"`.
   - Thresholds are config keys (`share.tripwirePasswordLimit`, `share.tripwireDownloadLimit`,
     `share.tripwireDistinctIps`, `share.tripwireWindowMinutes`) so the demo can lower them.
   - Owner dashboard shows a red "Tripwire" badge with the reason. Recipient sees the revoked
     message. Restoring a share is out of scope (owner re-shares).
   - Priority: the password rule is must-do; the burst rule is cut first if time runs short.
9. **Safety card on the download page (distinguishing feature #1, rubric 7).** The recipient
   share page (`frontend/src/pages/share/[shareId]`) shows, before any download, a card with:
   shared by (display name/username) and when; each file's name, size and **detected type**;
   "Checked: no executables or scripts" (true because of the blocklist in change 6, shown as
   the list of checks performed); **live countdown ring** to expiry; "X of Y views left" (or
   "unlimited"); "password protected" badge if applicable. Data comes from the existing share
   metadata endpoint, extended with any missing fields — no new trust-sensitive data is
   exposed (never owner email, never other shares).

## 3b. Look and feel

Goal: the project should not look like a stock self-hosted app.
- Frontend is Next.js 15 (pages router) + **Mantine 6 + React 18**, no Tailwind. RareUI
  (Codewithswappy/RareUI, MIT, copy-paste components) targets React 19 + Tailwind 4 + Framer
  Motion. *(Call:)* add Tailwind alongside Mantine with **preflight disabled**, add
  `framer-motion`, and copy in only the components we use, adapting any React-19-only APIs.
  If a component fights React 18, drop it — don't upgrade React.
- Redesign only the two judge-facing pages: **landing/upload** (animated background, animated
  drop zone, strong hero line) and the **recipient share page** (built around the safety
  card). Dashboard/admin keep Mantine, restyled via a custom Mantine theme (colours, radius,
  font) so the app feels consistent.
- New app name and logo replace "Pingvin Share X" branding in the UI (keep the BSD-2 licence
  and credit upstream in the README). Name is the team's choice; builder uses a placeholder.

## 3c. Registration

*(Call, user didn't object:)* public sign-up stays **open** so judges can try it; every user
gets the 50 MB default quota. Risk (≈10 full accounts fill the 500 MB volume) is documented;
admin can turn off `allowRegistration` in the admin UI if abused.

## 4. Architecture & storage (as Pingvin does it — we explain, not change)

NestJS backend (TypeScript, Prisma ORM, SQLite) + Next.js frontend, one Docker image, port
3000. Files on disk under `backend/data/uploads/shares/<shareId>/<fileId>`; metadata in
`backend/data/pingvin-share.db`. Both live in the `/opt/app/backend/data` volume, so they
**survive restarts and redeploys** when that path is a persistent volume. Upload is chunked
(`upload-init` → chunks → `upload-complete`), limits checked per chunk. Downloads go through
the backend (guards check share exists, not expired/removed, password token, view limits).

## 5. Deployment

- **Railway** free trial (no card, $5 credit, 30 days) deploying our fork's `Dockerfile` from
  GitHub, with a **volume mounted at `/opt/app/backend/data`** (500 MB cap on trial — fine for
  10 MB/50 MB limits). `TRUST_PROXY=true` behind Railway's proxy.
- Deploy a vanilla build **first** (in the first ~30 min) to de-risk; then redeploy with changes.
- ClamAV: not on Railway (needs ~1 GB RAM). Demo locally with the documented ClamAV docker
  integration + EICAR test file if time allows; README explains the trade-off.
- Local run: `docker compose up` with `docker-compose.local.yml` (builds from source).

## 6. Deliverables beyond code

- `README` section "PS2 answers" — one subsection per rubric question, plain language, with
  pointers to the exact files.
- `scripts/attack-demo.sh` (curl): oversize upload → 413; quota exceeded → 413; guessed short
  link → not found; expired link message; revoked link message; access another user's share
  via owner API → 403/404; `.html`/`a.pdf.exe` upload → blocked; file served as attachment with
  nosniff/CSP headers; **6 wrong passwords → link auto-revoked by tripwire**.
- Seeded demo accounts (admin + one owner) — credentials kept in `.env.example`/README, not
  real passwords.
- Architecture diagram (simple, in README).

## 7. Timeline (target)

Backend and frontend work run in parallel (separate subagents, separate files).

| Time | Backend track | Frontend track |
|---|---|---|
| 0:00–0:30 | Fork, run locally, deploy vanilla to Railway with volume | — |
| 0:30–1:30 | Changes 1–3, 5–6 (IDs, downloads, revoke, limits, blocklist/headers) | Tailwind + framer-motion setup, theme, landing/upload redesign |
| 1:30–2:15 | Changes 7–8 (access events, tripwire) + metadata fields for the card | Change 4 messages + change 9 safety card + share page redesign, Revoke/Downloads/Tripwire/activity in My Shares |
| 2:15–2:45 | Merge, redeploy on fresh volume, attack-demo script on live URL | |
| 2:45–3:20 | README rubric answers + diagram, buffer | |

Cut order if late: tripwire burst rule → activity list UI → landing animations → custom theme.

## 8. Left to the builder

Exact UI placement/wording, migration naming, whether owner downloads count, how to
surface revoke vs. expire in the UI, test approach (existing backend tests vs. curl script),
whether to remove reverse-share UI. Server-generated IDs must not break the reverse-share
upload path (out of scope but must not crash).
