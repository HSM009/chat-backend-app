/*
  Warnings:

  - You are about to drop the column `title` on the `Conversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "title",
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "mutedUntil" TIMESTAMP(3);
