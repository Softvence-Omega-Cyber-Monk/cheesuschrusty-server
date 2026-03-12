/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lemonCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripeCustomerId",
ADD COLUMN     "lemonCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_lemonCustomerId_key" ON "users"("lemonCustomerId");
