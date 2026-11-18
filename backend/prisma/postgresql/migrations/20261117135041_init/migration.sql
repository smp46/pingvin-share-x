-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "password" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ldapDN" TEXT,
    "shareSizeLimit" TEXT,
    "storageQuotaLimit" TEXT,
    "allowShare" BOOLEAN NOT NULL DEFAULT true,
    "allowCreateReverseShares" BOOLEAN NOT NULL DEFAULT true,
    "maxShares" INTEGER,
    "maxReverseShares" INTEGER,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpVerified" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "isActivated" BOOLEAN NOT NULL DEFAULT true,
    "activationToken" TEXT,
    "activationTokenExpiresAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "oauthIDToken" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "ResetPasswordToken" (
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ResetPasswordToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "OAuthUser" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerUsername" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OAuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "name" TEXT,
    "uploadLocked" BOOLEAN NOT NULL DEFAULT false,
    "isZipReady" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "expiration" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "removedReason" TEXT,
    "creatorId" TEXT,
    "reverseShareId" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReverseShare" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "shareExpiration" TIMESTAMP(3) NOT NULL,
    "maxShareSize" TEXT NOT NULL,
    "sendEmailNotification" BOOLEAN NOT NULL,
    "remainingUses" INTEGER NOT NULL,
    "simplified" BOOLEAN NOT NULL DEFAULT false,
    "publicAccess" BOOLEAN NOT NULL DEFAULT true,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "ReverseShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareRecipient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,

    CONSTRAINT "ShareRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareSecurity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT,
    "maxViews" INTEGER,
    "restrictToRecipients" BOOLEAN NOT NULL DEFAULT false,
    "shareId" TEXT,

    CONSTRAINT "ShareSecurity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareUserRecipient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,

    CONSTRAINT "ShareUserRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "defaultValue" TEXT NOT NULL DEFAULT '',
    "value" TEXT,
    "obscured" BOOLEAN NOT NULL DEFAULT false,
    "secret" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("name","category")
);

-- CreateTable
CREATE TABLE "AdminNoticeDismissal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noticeId" TEXT NOT NULL,
    "dismissedByUserId" TEXT,
    "dismissedByUsername" TEXT,

    CONSTRAINT "AdminNoticeDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_ldapDN_key" ON "User"("ldapDN");

-- CreateIndex
CREATE UNIQUE INDEX "User_activationToken_key" ON "User"("activationToken");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ResetPasswordToken_userId_key" ON "ResetPasswordToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReverseShare_token_key" ON "ReverseShare"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ShareSecurity_shareId_key" ON "ShareSecurity"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareUserRecipient_userId_shareId_key" ON "ShareUserRecipient"("userId", "shareId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminNoticeDismissal_noticeId_key" ON "AdminNoticeDismissal"("noticeId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetPasswordToken" ADD CONSTRAINT "ResetPasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthUser" ADD CONSTRAINT "OAuthUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_reverseShareId_fkey" FOREIGN KEY ("reverseShareId") REFERENCES "ReverseShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReverseShare" ADD CONSTRAINT "ReverseShare_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareRecipient" ADD CONSTRAINT "ShareRecipient_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareSecurity" ADD CONSTRAINT "ShareSecurity_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareUserRecipient" ADD CONSTRAINT "ShareUserRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareUserRecipient" ADD CONSTRAINT "ShareUserRecipient_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNoticeDismissal" ADD CONSTRAINT "AdminNoticeDismissal_dismissedByUserId_fkey" FOREIGN KEY ("dismissedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
