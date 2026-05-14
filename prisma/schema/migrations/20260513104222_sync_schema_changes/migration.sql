/*
  Warnings:

  - The `provider` column on the `lessons` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialProvider" ADD VALUE 'GEMINI';
ALTER TYPE "CredentialProvider" ADD VALUE 'STRIPE';
ALTER TYPE "CredentialProvider" ADD VALUE 'OPENROUTER';

-- DropIndex
DROP INDEX "chat_sessions_userId_createdAt_idx";

-- DropIndex
DROP INDEX "integration_usage_stats_provider_recordedAt_idx";

-- DropIndex
DROP INDEX "integration_usage_stats_recordedAt_idx";

-- DropIndex
DROP INDEX "support_chat_messages_escalated_createdAt_idx";

-- DropIndex
DROP INDEX "support_chat_messages_userId_createdAt_idx";

-- DropIndex
DROP INDEX "support_chat_tickets_status_createdAt_idx";

-- DropIndex
DROP INDEX "support_chat_tickets_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "knowledge_entries" ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "generation_seed" TEXT,
DROP COLUMN "provider",
ADD COLUMN     "provider" TEXT;

-- DropEnum
DROP TYPE "AIProvider";

-- CreateIndex
CREATE INDEX "chat_sessions_userId_createdAt_idx" ON "chat_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_usage_stats_provider_recordedAt_idx" ON "integration_usage_stats"("provider", "recordedAt");

-- CreateIndex
CREATE INDEX "integration_usage_stats_recordedAt_idx" ON "integration_usage_stats"("recordedAt");

-- CreateIndex
CREATE INDEX "support_chat_messages_userId_createdAt_idx" ON "support_chat_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "support_chat_messages_escalated_createdAt_idx" ON "support_chat_messages"("escalated", "createdAt");

-- CreateIndex
CREATE INDEX "support_chat_tickets_userId_createdAt_idx" ON "support_chat_tickets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "support_chat_tickets_status_createdAt_idx" ON "support_chat_tickets"("status", "createdAt");
