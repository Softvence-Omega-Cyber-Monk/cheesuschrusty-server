-- CreateTable
CREATE TABLE "branding_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformLogoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#003213',
    "secondaryColor" TEXT NOT NULL DEFAULT '#3F83F5',
    "accentColor" TEXT NOT NULL DEFAULT '#0e0ebf',
    "headingFont" TEXT NOT NULL DEFAULT 'Inter',
    "bodyFont" TEXT NOT NULL DEFAULT 'Inter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_settings_pkey" PRIMARY KEY ("id")
);
