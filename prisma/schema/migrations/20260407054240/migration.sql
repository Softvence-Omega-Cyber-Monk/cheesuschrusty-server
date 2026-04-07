/*
  Warnings:

  - Added the required column `updatedAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planAlias" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "mrrContribution" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "cancellationReason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_history_userId_idx" ON "subscription_history"("userId");

-- CreateIndex
CREATE INDEX "subscription_history_recordedAt_idx" ON "subscription_history"("recordedAt");

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
