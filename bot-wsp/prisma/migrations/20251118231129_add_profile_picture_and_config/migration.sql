-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "profilePictureUpdatedAt" TIMESTAMP(3),
ALTER COLUMN "customId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "sessionCleanupIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "invoiceGenerationDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "tokenExpirationMinutes" INTEGER NOT NULL DEFAULT 30,
    "tokenCleanupIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "profilePictureUpdateIntervalDays" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
