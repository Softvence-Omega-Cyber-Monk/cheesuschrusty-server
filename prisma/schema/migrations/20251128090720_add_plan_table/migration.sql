-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "alias" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT[],
    "stripePriceId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_alias_key" ON "Plan"("alias");
