/*
  Warnings:

  - You are about to drop the column `loginAttempts` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "loginAttempts",
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
