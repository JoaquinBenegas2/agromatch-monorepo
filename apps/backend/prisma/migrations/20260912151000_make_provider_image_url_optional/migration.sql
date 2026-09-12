ALTER TABLE "Provider" ALTER COLUMN "imageUrl" DROP NOT NULL;

UPDATE "Provider" SET "imageUrl" = NULL WHERE "imageUrl" = '';
