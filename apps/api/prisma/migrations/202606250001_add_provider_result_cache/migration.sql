-- CreateTable
CREATE TABLE "ProviderResult" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "requestJson" JSONB NOT NULL,
    "responseJson" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderResult_cacheKey_key" ON "ProviderResult"("cacheKey");

-- CreateIndex
CREATE INDEX "ProviderResult_provider_idx" ON "ProviderResult"("provider");

-- CreateIndex
CREATE INDEX "ProviderResult_provider_operation_idx" ON "ProviderResult"("provider", "operation");

-- CreateIndex
CREATE INDEX "ProviderResult_expiresAt_idx" ON "ProviderResult"("expiresAt");
