/*
  Warnings:

  - The values [CLOTHING] on the enum `Category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Category_new" AS ENUM ('ALL', 'TEXTBOOKS', 'ELECTRONICS', 'FURNITURE', 'KITCHENWARE', 'FREE_STUFF', 'OTHER');
ALTER TABLE "Listing" ALTER COLUMN "category" TYPE "Category_new" USING ("category"::text::"Category_new");
ALTER TYPE "Category" RENAME TO "Category_old";
ALTER TYPE "Category_new" RENAME TO "Category";
DROP TYPE "Category_old";
COMMIT;

-- CreateTable
CREATE TABLE "Swap" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingAId" INTEGER NOT NULL,
    "listingBId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Swap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_listingAId_fkey" FOREIGN KEY ("listingAId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_listingBId_fkey" FOREIGN KEY ("listingBId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
