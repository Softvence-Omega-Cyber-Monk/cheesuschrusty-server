/*
  Warnings:

  - You are about to drop the column `difficulty` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `lessons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "difficulty",
DROP COLUMN "format",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "level" TEXT,
ADD COLUMN     "skill" "LessonType",
ADD COLUMN     "target_language" TEXT,
ADD COLUMN     "task_id" TEXT;
