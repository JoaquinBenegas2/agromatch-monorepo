-- RN-30: a DRAFT must preserve genuinely missing location and time window.
ALTER TABLE "Need" ALTER COLUMN "where" DROP NOT NULL;
ALTER TABLE "Need" ALTER COLUMN "window" DROP NOT NULL;
