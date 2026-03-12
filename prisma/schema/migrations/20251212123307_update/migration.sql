/*
  Warnings:

  - You are about to drop the column `pausedAt` on the `active_flashcard_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `active_flashcard_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "active_flashcard_sessions" DROP COLUMN "pausedAt",
DROP COLUMN "startedAt";
