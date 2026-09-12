/*
  Warnings:

  - Added the required column `goal` to the `Classification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Classification" ADD COLUMN     "goal" JSONB NOT NULL;
