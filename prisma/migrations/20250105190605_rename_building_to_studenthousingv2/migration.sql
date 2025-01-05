/*
  Warnings:

  - Added the required column `cityId` to the `Studenthousing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cityId` to the `University` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Studenthousing" ADD COLUMN     "cityId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "cityId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Studenthousing" ADD CONSTRAINT "Studenthousing_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
