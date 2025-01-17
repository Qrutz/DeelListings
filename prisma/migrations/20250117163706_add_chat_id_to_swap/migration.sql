-- AlterTable
ALTER TABLE "Swap" ADD COLUMN     "chatId" TEXT;

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
