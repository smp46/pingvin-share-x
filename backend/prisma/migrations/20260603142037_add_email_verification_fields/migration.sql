-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ldapDN" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpVerified" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "isActivated" BOOLEAN NOT NULL DEFAULT true,
    "activationToken" TEXT,
    "activationTokenExpiresAt" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isAdmin", "ldapDN", "password", "totpEnabled", "totpSecret", "totpVerified", "updatedAt", "username") SELECT "createdAt", "email", "id", "isAdmin", "ldapDN", "password", "totpEnabled", "totpSecret", "totpVerified", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_ldapDN_key" ON "User"("ldapDN");
CREATE UNIQUE INDEX "User_activationToken_key" ON "User"("activationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
