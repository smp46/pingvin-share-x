I've reproduced the vulnerability and found its cause. The fix I'm proposing makes both reproduction tests pass. I applied it only temporarily to test it and then reverted it, so your working tree has no app changes, per your approve-first workflow.

Is the report accurate?

Mostly yes, with two corrections.

┌───────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┐
│           Claim           │                                              Result                                               │
├───────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ An empty password signs   │ Confirmed. It works by username and by email, and returns a real accessToken.                     │
│ in as any LDAP user       │                                                                                                   │
├───────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Admin escalation (the     │ Confirmed. An empty-password sign-in as boss (in the LDAP admin group) produced a session with    │
│ report's note)            │ isAdmin=true.                                                                                     │
├───────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Depends on the directory  │ True, and it matters. OpenLDAP rejects these binds by default (unwillingToPerform), so only       │
│ allowing unauthenticated  │ directories configured like AD are exposed. I couldn't test real AD; the test directory is        │
│ binds                     │ OpenLDAP set to accept these binds the way AD does.                                               │
├───────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
│                           │ Partly wrong. LDAP users are created with a random local password hash (user.service.ts:221), so  │
│ verifyPassword is a       │ they never reach the LDAP branch. It is only reachable for OIDC-created users (no local password) │
│ second path               │  whose username matches an LDAP account. The impact is small: a logged-in user can enable TOTP    │
│                           │ with "".                                                                                          │
└───────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘

I also found something the report doesn't mention: the sign-in form trims the password (SignInForm.tsx:97). A password made only of spaces passes the form check and reaches the API as "", so a user could trigger the bug from the normal UI.

Cause

There is no empty-password check anywhere along the path:
- The sign-in DTO's password field only requires a string, so "" is accepted (authSignIn.dto.ts).
- The LDAP library sends "" to the directory as an ordinary bind, without rejecting it.
- The directory treats that as an anonymous bind and answers success.
- LdapService.authenticateUser treats any successful bind as proof of the password and returns the user (ldap.service.ts:84).

Reproduction (e2e, under e2e/)

- Test directory: a new OpenLDAP container (docker/ldap.Dockerfile, docker/ldap/{slapd.conf,seed.ldif}), set to accept empty-password binds, with users alice, boss (admin group) and carol. I added it to the compose file and scripts/stack.sh, and added "ldap.enabled": false to BASELINE so every spec resets it.
- Test spec: tests/repro/ldap-empty-password.spec.ts has two @probe tests. Each first checks that the right password works and a wrong one is rejected. Then:
  - one tries empty-password sign-in as alice (username and email) and as boss;
  - the other signs in through OIDC as carol and tries to enable TOTP with "".
- Before the fix: both fail on the bug itself.
- With the fix: ./e2e run repro/ldap-empty-password --compare 27e80f6a gives verdict pass, both probes going from failing to passing. ./e2e check is ok.

Proposed fix (stage 1)

--- a/backend/src/auth/ldap.service.ts
+++ b/backend/src/auth/ldap.service.ts
@@ -43,6 +43,13 @@ export class LdapService {
     username: string,
     password: string,
   ): Promise<Entry | null> {
+    if (typeof password !== "string" || password.length === 0) {
+      this.logger.verbose(
+        `Authentication for username ${username} failed. Empty password.`,
+      );
+      return null;
+    }
+
     if (!username.match(/^[a-zA-Z0-9-_.@]+$/)) {
--- a/backend/src/auth/dto/authSignIn.dto.ts
+++ b/backend/src/auth/dto/authSignIn.dto.ts
@@ -1,4 +1,4 @@
-import { IsEmail, IsOptional, IsString } from "class-validator";
+import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
@@ -10,5 +10,6 @@ export class AuthSignInDTO {
   @IsString()
+  @IsNotEmpty()
   password: string;

The check is in the service, so both sign-in and verifyPassword are covered; the DTO rule adds a second layer. It checks length, not trimmed content: a password of spaces is a real password, and the directory checks it normally (it returns "invalid credentials" if wrong). The diff is saved at /tmp/claude-1000/-home-smp-Uni-Projects-pingvin-share-x/704420ac-0228-4a28-9a1a-f4781dda4e3c/scratchpad/ldap-fix.diff.

Side effects

- Status code: an empty password now returns 400 (a validation message) instead of 401, including for a password typed as only spaces. It reveals nothing about whether the account exists. No legitimate login uses an empty password, and the system tests never send one.
- Regression runs with the fix applied: auth (27 passed), oidc (24 passed) and admin (88 passed) show no new failures. tsc and eslint are clean apart from a missing jose module locally, which was already the case.
- Earlier admin failures: one admin run failed 2 test-email tests. That run reused a stack that had already run auth and oidc. The same tests pass on fresh stacks both with and without the fix, and the whole admin area passes right after the repro spec. So the cause is leftover stack state, not this change.

Optional stage 2

verifyPassword checks the wrong condition:
- It sends OIDC users to LDAP under their local username, which could match a different person's LDAP account.
- With LDAP off, the same users hit argon.verify(null, …), which throws and returns a 500.
- Real LDAP users never re-authenticate against LDAP, so they can't enable TOTP.

A safer version, not tested:

   async verifyPassword(user: User, password: string) {
-    if (!user.password && this.config.get("ldap.enabled")) {
+    if (!password) return false;
+
+    if (user.ldapDN && this.config.get("ldap.enabled")) {
       return !!(await this.ldapService.authenticateUser(
         user.username,
         password,
       ));
     }

+    if (!user.password) return false;
+
     return argon.verify(user.password, password);
   }

Its catch: LDAP users who first signed in by email have a placeholder username (user_<id>), so they still couldn't re-authenticate. Binding with the stored ldapDN instead would fix that, but it's a bigger change.

Also worth noting

- Service account: if an admin sets a bind DN for the LDAP service account but leaves its password empty, that connection is also an unauthenticated bind. It doesn't let anyone in, but a warning in the logs would help.
- Harness bug: --compare HEAD built 4d8041c5 instead of 27e80f6a, because HEAD is resolved inside the reused worktree. Resolving the commit in the main repo before checking out would fix it. I used the explicit SHA to get the proof above.

Shall I apply stage 1, and stage 2 as well? Once you've committed, I'll switch the repro tags to @fix:<sha>.
