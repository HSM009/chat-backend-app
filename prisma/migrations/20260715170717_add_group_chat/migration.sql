-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "role" "ConversationRole" NOT NULL DEFAULT 'MEMBER';
