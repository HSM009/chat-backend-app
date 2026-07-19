import { connectionManager } from "./connection-manager.js";
import { WebSocketEvents } from "./events.js";
import { prisma } from "../config/prisma.js";

export async function broadcastTyping(
  currentUserId: string,
  conversationId: string,
  typing: boolean,
) {
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
    },
    select: {
      userId: true,
    },
  });

  for (const participant of participants) {
    if (participant.userId === currentUserId) {
      continue;
    }

    connectionManager.send(
      participant.userId,
      typing ? WebSocketEvents.TYPING_START : WebSocketEvents.TYPING_STOP,
      {
        conversationId,
        userId: currentUserId,
      },
    );
  }
}
