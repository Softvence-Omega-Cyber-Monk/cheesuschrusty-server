/*
  Warnings:

  - The `skillArea` column on the `badges` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `skillArea` on the `cefr_confidence_cache` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `skillArea` on the `confidence_update_queue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `skillArea` on the `practice_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "SkillArea" ADD VALUE 'grammar';

-- AlterTable
ALTER TABLE "badges" DROP COLUMN "skillArea",
ADD COLUMN     "skillArea" TEXT;

-- AlterTable
ALTER TABLE "cefr_confidence_cache" DROP COLUMN "skillArea",
ADD COLUMN     "skillArea" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "confidence_update_queue" DROP COLUMN "skillArea",
ADD COLUMN     "skillArea" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "practice_sessions" DROP COLUMN "skillArea",
ADD COLUMN     "skillArea" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cefr_confidence_cache_userId_skillArea_key" ON "cefr_confidence_cache"("userId", "skillArea");

-- CreateIndex
CREATE UNIQUE INDEX "confidence_update_queue_userId_skillArea_key" ON "confidence_update_queue"("userId", "skillArea");

-- CreateIndex
CREATE INDEX "practice_sessions_skillArea_idx" ON "practice_sessions"("skillArea");
