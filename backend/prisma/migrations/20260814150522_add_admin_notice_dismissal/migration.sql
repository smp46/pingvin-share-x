-- CreateTable
CREATE TABLE "AdminNoticeDismissal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noticeId" TEXT NOT NULL,
    "dismissedByUserId" TEXT,
    "dismissedByUsername" TEXT,
    CONSTRAINT "AdminNoticeDismissal_dismissedByUserId_fkey" FOREIGN KEY ("dismissedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminNoticeDismissal_noticeId_key" ON "AdminNoticeDismissal"("noticeId");
