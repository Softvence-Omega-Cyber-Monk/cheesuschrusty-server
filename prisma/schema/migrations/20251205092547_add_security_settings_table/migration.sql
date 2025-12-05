-- CreateTable
CREATE TABLE "security_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "requireSpecialChars" BOOLEAN NOT NULL DEFAULT true,
    "requireUppercaseLetters" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "dataRetentionPolicy" BOOLEAN NOT NULL DEFAULT true,
    "gdprComplianceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id")
);
