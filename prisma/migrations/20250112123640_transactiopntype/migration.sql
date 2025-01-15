-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'SWAP', 'BOTH');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "transactionType" "TransactionType" NOT NULL DEFAULT 'SALE';
