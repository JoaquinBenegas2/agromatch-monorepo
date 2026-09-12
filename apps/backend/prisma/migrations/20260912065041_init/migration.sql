-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "farmIds" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sexedPct" INTEGER NOT NULL,
    "beefPct" INTEGER NOT NULL,
    "calvingEaseMaxHeifer" DOUBLE PRECISION NOT NULL,
    "scsGrayZoneFrom" DOUBLE PRECISION NOT NULL,
    "scsGrayZoneTo" DOUBLE PRECISION NOT NULL,
    "plGrayZoneFrom" DOUBLE PRECISION NOT NULL,
    "plGrayZoneTo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Female" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "visualId" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "sireNaab" TEXT,
    "category" TEXT NOT NULL,
    "profile" JSONB,

    CONSTRAINT "Female_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bull" (
    "naab" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "profile" JSONB,
    "sireNaab" TEXT,
    "calvingEase" DOUBLE PRECISION,
    "semenTypes" TEXT[],
    "pricePerDose" DOUBLE PRECISION,
    "source" TEXT NOT NULL,

    CONSTRAINT "Bull_pkey" PRIMARY KEY ("naab")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "femaleId" TEXT NOT NULL,
    "goalHash" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "semenType" TEXT,
    "ciPercentile" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[],
    "corrective" TEXT[],
    "reasons" TEXT[],

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreedingPlan" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "doses" JSONB NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "avgExpectedProgeny" JSONB NOT NULL,

    CONSTRAINT "BreedingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "femaleId" TEXT NOT NULL,
    "bullNaab" TEXT NOT NULL,
    "semenType" TEXT NOT NULL,
    "compatibility" DOUBLE PRECISION NOT NULL,
    "pricePerDose" DOUBLE PRECISION,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Need" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "where" JSONB NOT NULL,
    "radiusKm" DOUBLE PRECISION,
    "window" JSONB NOT NULL,
    "magnitude" JSONB,
    "constraints" TEXT[],
    "budget" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "goal" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "missingFields" TEXT[],
    "confidence" JSONB,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Need_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "base" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "reputationAvg" DOUBLE PRECISION,
    "reputationJobs" INTEGER NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "coverageRadiusKm" DOUBLE PRECISION NOT NULL,
    "capacityPerDay" JSONB,
    "availability" JSONB NOT NULL,
    "priceModel" TEXT NOT NULL,
    "priceFrom" DOUBLE PRECISION,
    "certifications" TEXT[],
    "attributes" JSONB NOT NULL,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HerdImport" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "file" BYTEA NOT NULL,
    "filename" TEXT NOT NULL,
    "proposal" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HerdImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Female_farmId_visualId_key" ON "Female"("farmId", "visualId");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_farmId_femaleId_key" ON "Classification"("farmId", "femaleId");

-- CreateIndex
CREATE UNIQUE INDEX "BreedingPlan_farmId_key" ON "BreedingPlan"("farmId");

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BreedingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
