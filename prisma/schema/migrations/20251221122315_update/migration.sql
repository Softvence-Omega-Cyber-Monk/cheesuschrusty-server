/*
  Warnings:

  - A unique constraint covering the columns `[lemonSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Subscription_lemonSubscriptionId_key" ON "Subscription"("lemonSubscriptionId");
