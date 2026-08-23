-- Prisma 6 stored every DateTime as an integer of milliseconds since the
-- epoch. Prisma 7 talks to SQLite through a driver adapter, which writes and
-- compares them as ISO 8601 text instead. SQLite sorts by storage class before
-- value, and every integer sorts below every string, so once the two formats
-- share a table a range filter stops meaning what it says: "expiration < now"
-- matches every row an older release wrote, including the ones set never to
-- expire. The expiry job read that as a pile of dead shares and deleted them.
--
-- So rewrite the old rows in the format the new client uses. Only values still
-- held as integers are touched, which leaves NULLs alone and makes the
-- migration a no-op on a database that never saw Prisma 6.

UPDATE "AdminNoticeDismissal"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "Config"
   SET "updatedAt" = strftime('%Y-%m-%dT%H:%M:%f', "updatedAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("updatedAt") = 'integer';

UPDATE "File"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "LoginToken"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "LoginToken"
   SET "expiresAt" = strftime('%Y-%m-%dT%H:%M:%f', "expiresAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("expiresAt") = 'integer';

UPDATE "RefreshToken"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "RefreshToken"
   SET "expiresAt" = strftime('%Y-%m-%dT%H:%M:%f', "expiresAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("expiresAt") = 'integer';

UPDATE "ResetPasswordToken"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "ResetPasswordToken"
   SET "expiresAt" = strftime('%Y-%m-%dT%H:%M:%f', "expiresAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("expiresAt") = 'integer';

UPDATE "ReverseShare"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "ReverseShare"
   SET "shareExpiration" = strftime('%Y-%m-%dT%H:%M:%f', "shareExpiration" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("shareExpiration") = 'integer';

UPDATE "Share"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "Share"
   SET "expiration" = strftime('%Y-%m-%dT%H:%M:%f', "expiration" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("expiration") = 'integer';

UPDATE "Share"
   SET "updatedAt" = strftime('%Y-%m-%dT%H:%M:%f', "updatedAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("updatedAt") = 'integer';

UPDATE "Share"
   SET "blockedAt" = strftime('%Y-%m-%dT%H:%M:%f', "blockedAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("blockedAt") = 'integer';

UPDATE "ShareAccessLog"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "ShareSecurity"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "ShareUserRecipient"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "User"
   SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("createdAt") = 'integer';

UPDATE "User"
   SET "updatedAt" = strftime('%Y-%m-%dT%H:%M:%f', "updatedAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("updatedAt") = 'integer';

UPDATE "User"
   SET "activationTokenExpiresAt" = strftime('%Y-%m-%dT%H:%M:%f', "activationTokenExpiresAt" / 1000.0, 'unixepoch') || '+00:00'
 WHERE typeof("activationTokenExpiresAt") = 'integer';
