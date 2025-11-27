/*
  Warnings:

  - You are about to drop the column `gender` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `nativeLanguage` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `proExpiresAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionPlan` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `targetLanguage` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `admin_prompts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_usage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcard_decks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcard_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `practice_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `skill_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('READING', 'WRITING', 'LISTENING', 'SPEAKING');

-- DropForeignKey
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_userId_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_reviews" DROP CONSTRAINT "flashcard_reviews_flashcardId_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_reviews" DROP CONSTRAINT "flashcard_reviews_userId_fkey";

-- DropForeignKey
ALTER TABLE "flashcards" DROP CONSTRAINT "flashcards_deckId_fkey";

-- DropForeignKey
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "skill_progress" DROP CONSTRAINT "skill_progress_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "gender",
DROP COLUMN "nativeLanguage",
DROP COLUMN "proExpiresAt",
DROP COLUMN "subscriptionPlan",
DROP COLUMN "targetLanguage",
ADD COLUMN     "currentLevel" "Difficulty" NOT NULL DEFAULT 'A1',
ADD COLUMN     "nativeLang" TEXT NOT NULL DEFAULT 'English',
ADD COLUMN     "targetLang" TEXT NOT NULL DEFAULT 'Italian',
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "admin_prompts";

-- DropTable
DROP TABLE "ai_usage";

-- DropTable
DROP TABLE "flashcard_decks";

-- DropTable
DROP TABLE "flashcard_reviews";

-- DropTable
DROP TABLE "flashcards";

-- DropTable
DROP TABLE "practice_sessions";

-- DropTable
DROP TABLE "skill_progress";

-- DropEnum
DROP TYPE "Gender";

-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "type" "LessonType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "prompt" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLessonProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "deckId" INTEGER NOT NULL,
    "frontText" TEXT NOT NULL,
    "backText" TEXT NOT NULL,
    "audioUrl" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardProgress_userId_cardId_key" ON "FlashcardProgress"("userId", "cardId");

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
