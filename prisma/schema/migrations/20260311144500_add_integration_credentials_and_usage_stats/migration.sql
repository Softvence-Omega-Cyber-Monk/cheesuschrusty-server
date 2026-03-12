CREATE TYPE "CredentialProvider" AS ENUM ('OPENAI', 'GROK', 'LEMONSQUEEZY', 'CLOUDINARY');

CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "provider" "CredentialProvider" NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "fieldNames" TEXT[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_usage_stats" (
    "id" TEXT NOT NULL,
    "provider" "CredentialProvider" NOT NULL,
    "operation" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "inputUnits" DOUBLE PRECISION,
    "outputUnits" DOUBLE PRECISION,
    "totalUnits" DOUBLE PRECISION,
    "costUsd" DOUBLE PRECISION,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_usage_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_credentials_provider_key" ON "integration_credentials"("provider");
CREATE INDEX "integration_usage_stats_provider_recordedAt_idx" ON "integration_usage_stats"("provider", "recordedAt" DESC);
CREATE INDEX "integration_usage_stats_recordedAt_idx" ON "integration_usage_stats"("recordedAt" DESC);
