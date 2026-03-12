-- AlterTable
ALTER TABLE "users" ADD COLUMN     "achievementNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "learningRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
