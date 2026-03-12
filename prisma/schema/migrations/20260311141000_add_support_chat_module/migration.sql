CREATE TYPE "ChatSupportTicketStatus" AS ENUM ('OPEN', 'REPLIED', 'CLOSED');

CREATE TABLE "support_chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "httpCode" INTEGER NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_chat_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "ChatSupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_chat_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_chat_ticket_replies" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "adminId" TEXT,
    "reply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_chat_ticket_replies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_chat_tickets_messageId_key" ON "support_chat_tickets"("messageId");
CREATE INDEX "support_chat_messages_userId_createdAt_idx" ON "support_chat_messages"("userId", "createdAt" DESC);
CREATE INDEX "support_chat_messages_escalated_createdAt_idx" ON "support_chat_messages"("escalated", "createdAt" DESC);
CREATE INDEX "support_chat_tickets_userId_createdAt_idx" ON "support_chat_tickets"("userId", "createdAt" DESC);
CREATE INDEX "support_chat_tickets_status_createdAt_idx" ON "support_chat_tickets"("status", "createdAt" DESC);
CREATE INDEX "support_chat_ticket_replies_ticketId_createdAt_idx" ON "support_chat_ticket_replies"("ticketId", "createdAt");

ALTER TABLE "support_chat_messages"
ADD CONSTRAINT "support_chat_messages_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_chat_tickets"
ADD CONSTRAINT "support_chat_tickets_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_chat_tickets"
ADD CONSTRAINT "support_chat_tickets_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "support_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_chat_ticket_replies"
ADD CONSTRAINT "support_chat_ticket_replies_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "support_chat_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_chat_ticket_replies"
ADD CONSTRAINT "support_chat_ticket_replies_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
