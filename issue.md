### Summary

When LDAP authentication is enabled, the system forwards the supplied password directly to the LDAP server without checking if it is empty. This means a client can authenticate as any existing LDAP user by providing an empty password, provided the LDAP server permits unauthenticated binds (which is the default behavior for many Active Directory configurations). The result is unintended access to user accounts.

### Details

Pingvin Share supports login via an LDAP server. During sign‑in, the backend forwards the username and password to the LDAP server using a *simple bind* operation. If the bind succeeds, Pingvin Share assumes the password was valid and logs the user in.

The current implementation does not verify that a password value is present, so an empty password is also passed to the LDAP server.

The sign‑in DTO currently defines the password field as:

```ts
// backend/src/auth/dto/authSignIn.dto.ts
export class AuthSignInDTO {
  @IsEmail() @IsOptional() email: string;
  @IsString() @IsOptional() username: string;
  @IsString() password: string;        // no @IsNotEmpty()
}
```

The LDAP service then attempts to bind using the supplied credentials:

```ts
// backend/src/auth/ldap.service.ts
const targetEntity = searchEntries[0];
try {
  await ldapClient.bind(targetEntity.dn, password);
  return targetEntity;
} catch (error) { /* ... */ }
```

According to the LDAP specification (RFC 4513), a bind with a username but an empty password is considered an *unauthenticated bind*. Many directory servers, including Active Directory by default, respond with success to such a request. Consequently, the bind does not raise an error, and Pingvin Share treats the response as a successful login, issuing a session token.

Additionally, the same `authenticateUser` method is invoked from `verifyPassword`, which bypasses the DTO entirely. Therefore, addressing only the DTO would not fully resolve the issue; the service logic also needs adjustment.

### Recommended Fix

Reject empty passwords before attempting the bind. Implement this check in the LDAP service so that both call paths are covered, and optionally add a validation rule in the DTO as a secondary safeguard:

```ts
// ldap.service.ts, at the start of authenticateUser()
if (!password) return null; // reject empty passwords

// authSignIn.dto.ts
@IsString() @IsNotEmpty() password: string;
```

### Proof of Concept

Preconditions: A Pingvin Share instance with LDAP enabled, connected to a directory that permits unauthenticated binds (e.g., a default Active Directory configuration), and knowledge of an existing LDAP account's username (e.g., `Administrator`, `Guest`).

Send a request with an existing username and an empty password:

```http
POST /api/auth/signIn HTTP/1.1
Host: example.lab
Content-Type: application/json

{"username":"Administrator","password":""}
```

The response includes a valid `access_token` and `refresh_token` for the supplied user.

### Potential Impact

If unaddressed, this behavior could allow unauthorized access to any LDAP‑backed account whose username or email is known or guessable. An unauthorized user could obtain the victim's access and refresh tokens and interact with the user's shares. If the compromised account has elevated privileges, the user could also access administrative configuration data, such as LDAP service‑account credentials, SMTP passwords, and OAuth client secrets, which are stored in cleartext.

### Note

The additional escalation path described above was not considered when the CVSS score was originally assigned.