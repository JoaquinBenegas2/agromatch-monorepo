-- RN-39: keep the reasons and facts from the latest matching run.
ALTER TABLE "Need" ADD COLUMN "lastMatchBoard" JSONB;
