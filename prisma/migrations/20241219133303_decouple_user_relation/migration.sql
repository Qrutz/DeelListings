-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_userId_fkey";

-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "userId" SET DATA TYPE TEXT;
