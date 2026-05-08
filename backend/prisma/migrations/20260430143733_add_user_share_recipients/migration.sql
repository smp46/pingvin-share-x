-- CreateTable
CREATE TABLE "ShareUserRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    CONSTRAINT "ShareUserRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShareUserRecipient_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShareSecurity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT,
    "maxViews" INTEGER,
    "restrictToRecipients" BOOLEAN NOT NULL DEFAULT false,
    "shareId" TEXT,
    CONSTRAINT "ShareSecurity_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShareSecurity" ("createdAt", "id", "maxViews", "password", "shareId") SELECT "createdAt", "id", "maxViews", "password", "shareId" FROM "ShareSecurity";
DROP TABLE "ShareSecurity";
ALTER TABLE "new_ShareSecurity" RENAME TO "ShareSecurity";
CREATE UNIQUE INDEX "ShareSecurity_shareId_key" ON "ShareSecurity"("shareId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShareUserRecipient_userId_shareId_key" ON "ShareUserRecipient"("userId", "shareId");
