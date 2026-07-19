import { prisma } from "../../config/prisma.js";
import { connectionManager } from "../../websocket/connection-manager.js";
import { WebSocketEvents } from "../../websocket/events.js";
import { ensureParticipant, getPresenceReceivers } from "./presence.helper.js";

export async function userConnected(userId: string) {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isOnline: true,
    },
  });

  const receivers = await getPresenceReceivers(userId);

  for (const receiver of receivers) {
    connectionManager.send(receiver, WebSocketEvents.USER_ONLINE, {
      userId,
    });
  }
}

export async function userDisconnected(userId: string) {
  const lastSeen = new Date();

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isOnline: false,
      lastSeen,
    },
  });

  const receivers = await getPresenceReceivers(userId);

  for (const receiver of receivers) {
    connectionManager.send(receiver, WebSocketEvents.USER_OFFLINE, {
      userId,
      lastSeen,
    });
  }
}

export async function startTyping(
  currentUserId: string,
  conversationId: string,
) {
  await ensureParticipant(currentUserId, conversationId);

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

    connectionManager.send(participant.userId, WebSocketEvents.USER_TYPING, {
      conversationId,
      userId: currentUserId,
    });
  }
}

export async function stopTyping(
  currentUserId: string,
  conversationId: string,
) {
  await ensureParticipant(currentUserId, conversationId);

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
      WebSocketEvents.USER_STOPPED_TYPING,
      {
        conversationId,
        userId: currentUserId,
      },
    );
  }
}
