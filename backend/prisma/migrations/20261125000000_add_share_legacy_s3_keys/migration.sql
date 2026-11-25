-- AlterTable
ALTER TABLE "Share" ADD COLUMN "legacyS3Keys" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Share" SET "legacyS3Keys" = true WHERE "storageProvider" = 'S3';
