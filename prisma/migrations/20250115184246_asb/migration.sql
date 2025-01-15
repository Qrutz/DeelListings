-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'USED', 'LIKE_NEW');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "condition" "Condition",
ADD COLUMN     "locationName" TEXT;

-- DropEnum
DROP TYPE "TransactionType";
