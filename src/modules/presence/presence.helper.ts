import { prisma } from "../../config/prisma.js";

export async function getPresenceReceivers(userId: string): Promise<string[]> {
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversation: {
        participants: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      userId: true,
    },
  });

  return [
    ...new Set(participants.map((p) => p.userId).filter((id) => id !== userId)),
  ];
}

export async function ensureParticipant(
  currentUserId: string,
  conversationId: string,
) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: currentUserId,
      },
    },
  });

  if (!participant) {
    throw new Error("You are not a participant in this conversation.");
  }

  return participant;
}
