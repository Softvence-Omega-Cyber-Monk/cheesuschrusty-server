/*
  Warnings:

  - You are about to drop the column `subCategoryType` on the `question_sets` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "question_sets_lessonId_subCategoryType_key";

-- AlterTable
ALTER TABLE "question_sets" DROP COLUMN "subCategoryType";
