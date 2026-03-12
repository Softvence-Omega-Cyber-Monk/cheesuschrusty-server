/*
  Warnings:

  - You are about to drop the `UserLessonProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SkillArea" AS ENUM ('reading', 'listening', 'writing', 'speaking');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PerformanceTrend" AS ENUM ('improving', 'stable', 'declining');

-- DropForeignKey
ALTER TABLE "UserLessonProgress" DROP CONSTRAINT "UserLessonProgress_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "UserLessonProgress" DROP CONSTRAINT "UserLessonProgress_userId_fkey";

-- DropTable
DROP TABLE "UserLessonProgress";

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" INTEGER,
    "skillArea" "SkillArea" NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cefr_confidence_cache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillArea" "SkillArea" NOT NULL,
    "cefrLevel" "Difficulty" NOT NULL DEFAULT 'B1',
    "confidenceLower" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceUpper" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceLevel" "ConfidenceLevel" NOT NULL DEFAULT 'LOW',
    "performanceTrend" "PerformanceTrend",
    "sessionsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cefr_confidence_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confidence_update_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillArea" "SkillArea" NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'session_milestone',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "confidence_update_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sessions_userId_idx" ON "practice_sessions"("userId");

-- CreateIndex
CREATE INDEX "practice_sessions_skillArea_idx" ON "practice_sessions"("skillArea");

-- CreateIndex
CREATE INDEX "practice_sessions_completedAt_idx" ON "practice_sessions"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cefr_confidence_cache_userId_skillArea_key" ON "cefr_confidence_cache"("userId", "skillArea");

-- CreateIndex
CREATE UNIQUE INDEX "confidence_update_queue_userId_skillArea_key" ON "confidence_update_queue"("userId", "skillArea");

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cefr_confidence_cache" ADD CONSTRAINT "cefr_confidence_cache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confidence_update_queue" ADD CONSTRAINT "confidence_update_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
