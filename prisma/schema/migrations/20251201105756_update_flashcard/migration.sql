/*
  Warnings:

  - You are about to drop the `Card` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Deck` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FlashcardProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FINISHED');

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_deckId_fkey";

-- DropForeignKey
ALTER TABLE "FlashcardProgress" DROP CONSTRAINT "FlashcardProgress_cardId_fkey";

-- DropForeignKey
ALTER TABLE "FlashcardProgress" DROP CONSTRAINT "FlashcardProgress_userId_fkey";

-- DropTable
DROP TABLE "Card";

-- DropTable
DROP TABLE "Deck";

-- DropTable
DROP TABLE "FlashcardProgress";

-- CreateTable
CREATE TABLE "flashcard_categories" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "frontText" TEXT NOT NULL,
    "backText" TEXT NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_progress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flashcard_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_flashcard_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "sessionData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateCompleted" TIMESTAMP(3),

    CONSTRAINT "active_flashcard_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flashcard_progress_userId_cardId_key" ON "flashcard_progress"("userId", "cardId");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "flashcard_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_flashcard_sessions" ADD CONSTRAINT "active_flashcard_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
