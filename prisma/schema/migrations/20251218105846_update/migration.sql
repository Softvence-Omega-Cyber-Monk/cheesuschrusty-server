/*
  Warnings:

  - You are about to drop the column `achievementNotificationsEnabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `learningRemindersEnabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `pushNotificationsEnabled` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "achievementNotificationsEnabled",
DROP COLUMN "learningRemindersEnabled",
DROP COLUMN "pushNotificationsEnabled",
ADD COLUMN     "achievementAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streakRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyUpdateEnabled" BOOLEAN NOT NULL DEFAULT true;
