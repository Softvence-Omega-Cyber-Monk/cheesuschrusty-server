-- CreateTable
CREATE TABLE "notification_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "newRegistrationAlert" BOOLEAN NOT NULL DEFAULT true,
    "paymentRelatedAlert" BOOLEAN NOT NULL DEFAULT true,
    "supportTicketAlert" BOOLEAN NOT NULL DEFAULT true,
    "dailyAnalyticsSummary" BOOLEAN NOT NULL DEFAULT false,
    "welcomeEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "learningRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "achievementNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);
