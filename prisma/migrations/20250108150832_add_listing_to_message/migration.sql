-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "listingId" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';
