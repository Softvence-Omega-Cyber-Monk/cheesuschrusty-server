-- AlterTable
ALTER TABLE "active_flashcard_sessions" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalTimeSeconds" INTEGER NOT NULL DEFAULT 0;
