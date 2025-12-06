/*
  Warnings:

  - You are about to drop the column `sessionTimeoutMinutes` on the `security_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "security_settings" DROP COLUMN "sessionTimeoutMinutes",
ADD COLUMN     "sessionTimeoutDays" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0;
