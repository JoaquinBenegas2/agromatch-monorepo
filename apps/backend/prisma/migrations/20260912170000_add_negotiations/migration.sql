ALTER TABLE "User" ADD COLUMN "providerId" TEXT;

ALTER TABLE "ServiceRequest"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "amount" DOUBLE PRECISION,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN "scheduledFor" TIMESTAMP(3),
ADD COLUMN "terms" TEXT;

CREATE TABLE "NegotiationMessage" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NegotiationMessage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "NegotiationMessage" ("id", "serviceRequestId", "senderName", "senderType", "body", "createdAt")
SELECT gen_random_uuid()::text, "id", 'Productor', 'CUSTOMER', "message", "createdAt"
FROM "ServiceRequest";

CREATE INDEX "User_providerId_idx" ON "User"("providerId");
CREATE INDEX "ServiceRequest_needId_idx" ON "ServiceRequest"("needId");
CREATE INDEX "ServiceRequest_providerId_idx" ON "ServiceRequest"("providerId");
CREATE INDEX "NegotiationMessage_serviceRequestId_createdAt_idx" ON "NegotiationMessage"("serviceRequestId", "createdAt");

ALTER TABLE "NegotiationMessage"
ADD CONSTRAINT "NegotiationMessage_serviceRequestId_fkey"
FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
