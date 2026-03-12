/*
  Warnings:

  - You are about to drop the column `daysPerWeek` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `focusAreas` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `goalMinutes` on the `study_plans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "study_plans" DROP COLUMN "daysPerWeek",
DROP COLUMN "expiresAt",
DROP COLUMN "focusAreas",
DROP COLUMN "goalMinutes";
