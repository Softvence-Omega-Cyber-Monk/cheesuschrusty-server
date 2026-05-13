-- DropIndex
DROP INDEX IF EXISTS "chat_sessions_userId_createdAt_idx";

-- AlterTable (Safe check for knowledge_entries)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_entries') THEN
        ALTER TABLE "knowledge_entries" ALTER COLUMN "tags" DROP DEFAULT;
    END IF;
END $$;

-- CreateIndex (Safe check for chat_sessions)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chat_sessions_userId_createdAt_idx') THEN
            CREATE INDEX "chat_sessions_userId_createdAt_idx" ON "chat_sessions"("userId", "createdAt");
        END IF;
    END IF;
END $$;
