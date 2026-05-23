-- AlterTable
ALTER TABLE "Share" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows: seed updatedAt with createdAt so old shares aren't all
-- treated as freshly-active by the deleteUnfinishedShares cron.
UPDATE "Share" SET "updatedAt" = "createdAt";