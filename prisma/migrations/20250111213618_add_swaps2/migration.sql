/*
  Warnings:

  - The primary key for the `Swap` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `proposerId` to the `Swap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `Swap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Swap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Swap" DROP CONSTRAINT "Swap_pkey",
ADD COLUMN     "proposerId" TEXT NOT NULL,
ADD COLUMN     "recipientId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Swap_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Swap_id_seq";
