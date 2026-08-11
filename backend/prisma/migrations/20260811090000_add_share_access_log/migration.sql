-- CreateTable
CREATE TABLE "ShareAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    CONSTRAINT "ShareAccessLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShareAccessLog_shareId_idx" ON "ShareAccessLog"("shareId");
