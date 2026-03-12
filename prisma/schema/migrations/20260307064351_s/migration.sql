-- DropIndex
DROP INDEX "chat_sessions_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "knowledge_entries" ALTER COLUMN "tags" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "chat_sessions_userId_createdAt_idx" ON "chat_sessions"("userId", "createdAt");
