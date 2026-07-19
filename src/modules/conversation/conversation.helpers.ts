import { prisma } from "../../config/prisma.js";

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

export async function ensureAdmin(
  currentUserId: string,
  conversationId: string,
) {
  const participant = await ensureParticipant(currentUserId, conversationId);

  if (participant.role !== "ADMIN") {
    throw new Error("Only admins can perform this action.");
  }

  return participant;
}
