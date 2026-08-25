# Security alert triage

A record of code scanning and dependency alerts that were looked at and left
open or dismissed, and why. It exists so the next person does not repeat the
investigation, and so that "39 open alerts" does not quietly become the normal
state that everyone scrolls past.

Reporting an actual vulnerability is covered in [SECURITY.md](SECURITY.md).

## How to use this

An alert belongs here once someone has decided about it. An alert that nobody
has looked at yet does not belong here, it belongs in the queue.

If a dismissal here turns out to be wrong, say so in this file rather than
quietly deleting the row. Being able to see that a judgement was made and later
corrected is more useful than a tidy list.

## Code scanning

### Fixed, not dismissed

| rule | where | what it was |
| --- | --- | --- |
| `js/client-side-unvalidated-url-redirection`, `js/xss` | `pages/auth/signIn.tsx`, `components/auth/SignInForm.tsx`, `components/auth/TotpForm.tsx` | Real. `?redirect=` could leave the site: the guard only checked for a leading slash, which `//evil.invalid` has, and the sign in page did not call the guard at all. Fixed by resolving the value against a known origin and keeping it only if it stayed there. |

### Dismissed as not applicable

| rule | count | why |
| --- | --- | --- |
| `js/path-injection` | 14 | Paths are built from `shareId` and `fileId`. `shareId` is checked against `^[a-zA-Z0-9_-]*={0,2}$` by `IdValidation` or, on the download route, by `FileSecurityGuard` itself, so it cannot carry a separator. `fileId` has to resolve to a `File` row before any path is built, and those ids are uuids the server generates. In `clamscan.service.ts` the file name comes from `readdirSync`, so it is a directory entry rather than anything a caller supplied. |
| `js/request-forgery` | 1 | `configService.getByCategory` builds a request path from a category, and the line above replaces anything not in a fixed list with `"general"`. |
| `js/remote-property-injection` | 3 | `this.multipartUploads[file.id]` in `s3.service.ts`. The same function rejects an id that is not a uuid before reaching it, and a uuid cannot be `__proto__`. |
| `js/insufficient-password-hash` | 1 | `getSharePasswordSignature` is an HMAC used inside a JWT the server signs, to notice that a share password changed. It is not where the password is stored, and a slow salted KDF could not be compared this way. |
| `js/empty-password-in-configuration-file` | 1 | `config.example.yaml` is a template. The empty SMTP password is the placeholder someone fills in. |
| `js/http-to-file-access` | 1 | Writing an uploaded chunk to disk, which is what the application is for. The share and file ids are validated as above. |

### Dismissed as intended behaviour

| rule | count | why |
| --- | --- | --- |
| `js/user-controlled-bypass` | 1 | `fileSecurity.guard.ts` lets an administrator reach any share when `security.allowAdminAccessAllShares` is on. The value is administrator-set rather than caller-supplied, and the branch still requires `user?.isAdmin`. The jwt strategy loads the user from the database on every request instead of trusting a claim in the token, so an account that loses admin loses this at the same moment. |

### Left open on purpose

| rule | count | why |
| --- | --- | --- |
| `js/clear-text-storage-of-sensitive-data` | 1 | The refresh token cookie is `httpOnly` and `sameSite: strict`, but `secure` follows `security.secureCookies`, which defaults to `false`. That default is worth changing per instance rather than in code: flipping it here would break every deployment served over plain HTTP on a LAN, which is a legitimate way to run this. Kept open as a standing reminder that the default is the weaker one. See the note at the end of this file. |

## A dismissal is pinned to a line

Dismissing an alert dismisses that instance of it. Editing the code around it
moves the line, code scanning raises it again as new, and the pull request goes
red on a finding that was already decided.

That happened to the `js/path-injection` alert in `clamscan.service.ts` the
first time that function was touched after this file was written. The answer is
to dismiss it again with the same reasoning, which is cheap because the
reasoning is written down here rather than being reconstructed each time. It is
not a sign the decision was wrong.

## Dependency alerts

| package | count | why it is still open |
| --- | --- | --- |
| `image-size` | 2 | Denial of service through infinite loops in the ICNS and JXL/HEIF parsers. **No patched version exists**: `<= 2.0.2` is vulnerable and `2.0.2` is the latest published. It reaches us through `@docusaurus/mdx-loader` in `docs/`, which is not part of the shipped image, and reaching the parsers means committing a malformed image to the documentation source. Left open on purpose so that a fix, when it is published, is noticed. |

## Configuration worth checking on an instance

Not an alert, but it came out of the same pass and is worth stating somewhere:

`security.secureCookies` defaults to `false`, so the refresh token cookie ships
without the `Secure` flag unless an administrator turns it on. HSTS covers the
practical case on a site that sets it, but there is no reason to rely on that.
Turn it on for any instance served over HTTPS.
