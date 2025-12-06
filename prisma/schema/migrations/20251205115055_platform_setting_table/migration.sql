-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformName" TEXT NOT NULL DEFAULT 'ItalianMaster',
    "platformTitle" TEXT,
    "platformDescription" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'English',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "allowNewRegistration" BOOLEAN NOT NULL DEFAULT true,
    "freeTrialEnabled" BOOLEAN NOT NULL DEFAULT true,
    "freeTrialPeriodDays" INTEGER NOT NULL DEFAULT 7,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
