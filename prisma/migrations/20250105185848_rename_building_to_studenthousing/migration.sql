/*
  Warnings:

  - You are about to drop the column `buildingId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Building` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_buildingId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "buildingId",
ADD COLUMN     "StudenthousingId" INTEGER,
ADD COLUMN     "isOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Building";

-- CreateTable
CREATE TABLE "Studenthousing" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "chatId" TEXT,

    CONSTRAINT "Studenthousing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_StudenthousingId_fkey" FOREIGN KEY ("StudenthousingId") REFERENCES "Studenthousing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
