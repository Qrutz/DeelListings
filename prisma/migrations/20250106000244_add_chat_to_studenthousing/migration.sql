/*
  Warnings:

  - A unique constraint covering the columns `[chatId]` on the table `Studenthousing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Studenthousing_chatId_key" ON "Studenthousing"("chatId");

-- AddForeignKey
ALTER TABLE "Studenthousing" ADD CONSTRAINT "Studenthousing_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
