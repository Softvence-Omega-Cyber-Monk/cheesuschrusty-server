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
