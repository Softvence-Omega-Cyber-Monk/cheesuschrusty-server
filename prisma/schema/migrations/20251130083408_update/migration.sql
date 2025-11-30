/*
  Warnings:

  - Added the required column `subCategoryType` to the `question_sets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubCategoryType" AS ENUM ('MAIN_PASSAGE', 'DIALOGUE_SEQUENCING', 'DICTATION_EXERCISE', 'AUDIO_COMPREHENSION', 'GRAMMAR_PRACTICE', 'COMPLETE_THE_SENTENCES', 'SHORT_ESSAY', 'READING_ALOUD', 'CONVERSATION_PRACTICE', 'PRONUNCIATION_PRACTICE');

-- AlterTable
ALTER TABLE "question_sets" DROP COLUMN "subCategoryType",
ADD COLUMN     "subCategoryType" "SubCategoryType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "question_sets_lessonId_subCategoryType_key" ON "question_sets"("lessonId", "subCategoryType");
