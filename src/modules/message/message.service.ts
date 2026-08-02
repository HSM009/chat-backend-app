import { prisma } from "../../config/prisma.js";
import { GetMessagesQuery, SearchMessagesQuery } from "./message.query.js";
import type {
  ReactToMessageInput,
  SendMessageInput,
  UpdateMessageInput,
} from "./message.schema.js";
import { connectionManager } from "../../websocket/connection-manager.js";
import { WebSocketEvents } from "../../websocket/events.js";
import { MessageType } from "../../generated/prisma/enums.js";
import { invalidateUserConversations } from "../../lib/cache.invalidation.js";

async function ensureParticipant(
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

export async function sendMessage(
  currentUserId: string,
  conversationId: string,
  data: SendMessageInput,
) {
  await ensureParticipant(currentUserId, conversationId);
  // Validate reply
  if (data.replyToId) {
    const replyTo = await prisma.message.findUnique({
      where: {
        id: data.replyToId,
      },
    });

    if (!replyTo) {
      throw new Error("Reply message not found.");
    }

    if (replyTo.conversationId !== conversationId) {
      throw new Error(
        "You can only reply to messages in the same conversation.",
      );
    }
  }

  if (data.mentions.length) {
    const mentionedUsers = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: {
          in: data.mentions,
        },
      },
      select: {
        userId: true,
      },
    });

    if (mentionedUsers.length !== data.mentions.length) {
      throw new Error("Cannot mention users outside the conversation.");
    }
  }

  const { message, participants } = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        conversationId,
        senderId: currentUserId,

        type: data.type,
        text: data.text,

        fileUrl: data.fileUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,

        replyToId: data.replyToId,
      },
    });

    if (data.mentions.length > 0) {
      await tx.messageMention.createMany({
        data: data.mentions.map((userId) => ({
          messageId: createdMessage.id,
          userId,
        })),
      });
    }

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageAt: createdMessage.createdAt,
        messageId: createdMessage.id,
      },
    });

    const participants = await tx.conversationParticipant.findMany({
      where: {
        conversationId,
      },
      select: {
        userId: true,
      },
    });

    const message = await tx.message.findUniqueOrThrow({
      where: {
        id: createdMessage.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        reads: true,
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        replyTo: {
          select: {
            id: true,
            type: true,
            text: true,
            deletedAt: true,
            fileUrl: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    console.log(JSON.stringify(message, null, 2));
    return {
      message,
      participants,
    };
  });

  await Promise.all(
    participants.map((participant) =>
      invalidateUserConversations(participant.userId),
    ),
  );

  for (const participant of participants) {
    if (participant.userId === currentUserId) {
      continue;
    }

    connectionManager.send(participant.userId, WebSocketEvents.MESSAGE_NEW, {
      conversationId,
      message,
      lastMessageAt: message.createdAt,
    });
  }

  for (const userId of data.mentions ?? []) {
    if (userId === currentUserId) {
      continue;
    }

    connectionManager.send(userId, WebSocketEvents.MESSAGE_MENTION, {
      conversationId,
      messageId: message.id,
      senderId: currentUserId,
    });
  }

  return message;
}

export async function getMessages(
  currentUserId: string,
  conversationId: string,
  query: GetMessagesQuery,
) {
  await ensureParticipant(currentUserId, conversationId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: query.limit,
    ...(query.cursor && {
      cursor: {
        id: query.cursor,
      },
      skip: 1,
    }),
    include: {
      sender: {
        select: {
          id: true,
          name: true,
        },
      },
      reads: {
        select: {
          userId: true,
          readAt: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          type: true,
          text: true,
          deletedAt: true,
          fileUrl: true,
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const formattedMessages = messages.map((message) => ({
    ...message,
    isDeleted: message.deletedAt !== null,
    text: message.deletedAt ? null : message.text,
    replyTo: message.replyTo
      ? {
          ...message.replyTo,
          text: message.replyTo.deletedAt ? null : message.replyTo.text,
        }
      : null,
  }));

  return {
    messages: formattedMessages,
    nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    hasMore: messages.length === query.limit,
  };
}

export async function updateMessage(
  currentUserId: string,
  messageId: string,
  data: UpdateMessageInput,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  if (message.senderId !== currentUserId) {
    throw new Error("You can only edit your own messages.");
  }

  if (message.type !== MessageType.TEXT) {
    throw new Error("Only text messages can be edited.");
  }

  if (message.deletedAt) {
    throw new Error("Cannot edit a deleted message.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.messageEditHistory.create({
      data: {
        messageId,
        oldText: message.text,
      },
    });

    return tx.message.update({
      where: {
        id: messageId,
      },
      data: {
        text: data.text,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId: message.conversationId,
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
      WebSocketEvents.MESSAGE_UPDATED,
      updated,
    );
  }
}

export async function deleteMessage(currentUserId: string, messageId: string) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  if (message.senderId !== currentUserId) {
    throw new Error("You can only delete your own messages.");
  }

  if (message.deletedAt) {
    throw new Error("Message already deleted.");
  }

  const { deletedMessage, participants } = await prisma.$transaction(
    async (tx) => {
      const deletedMessage = await tx.message.update({
        where: {
          id: messageId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      const lastMessage = await tx.message.findFirst({
        where: {
          conversationId: message.conversationId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      await tx.conversation.update({
        where: {
          id: message.conversationId,
        },
        data: {
          lastMessageAt: lastMessage?.createdAt ?? null,
        },
      });

      const participants = await tx.conversationParticipant.findMany({
        where: {
          conversationId: message.conversationId,
        },
        select: {
          userId: true,
        },
      });

      return {
        deletedMessage,
        participants,
      };
    },
  );

  await Promise.all(
    participants.map((participant) =>
      invalidateUserConversations(participant.userId),
    ),
  );

  for (const participant of participants) {
    connectionManager.send(
      participant.userId,
      WebSocketEvents.MESSAGE_DELETED,
      {
        conversationId: message.conversationId,
        messageId: deletedMessage.id,
        deletedAt: deletedMessage.deletedAt,
      },
    );
  }

  return deletedMessage;
}

export async function reactToMessage(
  currentUserId: string,
  messageId: string,
  data: ReactToMessageInput,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }
  await ensureParticipant(currentUserId, message.conversationId);

  if (message.deletedAt) {
    throw new Error("Cannot react to a deleted message.");
  }

  return prisma.messageReaction.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUserId,
      },
    },

    update: {
      emoji: data.emoji,
    },

    create: {
      messageId,
      userId: currentUserId,
      emoji: data.emoji,
    },
  });
}

export async function markMessageAsRead(
  currentUserId: string,
  messageId: string,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }
  await ensureParticipant(currentUserId, message.conversationId);

  const read = await prisma.messageRead.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUserId,
      },
    },

    update: {},

    create: {
      messageId,
      userId: currentUserId,
    },
  });
  const senderId = message.senderId;

  if (senderId !== currentUserId) {
    connectionManager.send(senderId, WebSocketEvents.READ_RECEIPT, {
      messageId,
      userId: currentUserId,
      readAt: read.readAt,
    });
  }
  return read;
}

export async function forwardMessage(
  currentUserId: string,
  messageId: string,
  targetConversationId: string,
) {
  const original = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!original) {
    throw new Error("Message not found.");
  }

  await ensureParticipant(currentUserId, original.conversationId);
  await ensureParticipant(currentUserId, targetConversationId);

  if (original.deletedAt) {
    throw new Error("Cannot forward a deleted message.");
  }
  const { forwarded, participants } = await prisma.$transaction(async (tx) => {
    const forwarded = await tx.message.create({
      data: {
        conversationId: targetConversationId,
        senderId: currentUserId,
        forwarded: true,
        type: original.type,
        text: original.text,
        fileUrl: original.fileUrl,
        fileName: original.fileName,
        mimeType: original.mimeType,
        fileSize: original.fileSize,
        replyToId: null,
      },

      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    await tx.conversation.update({
      where: {
        id: targetConversationId,
      },

      data: {
        lastMessageAt: forwarded.createdAt,
      },
    });
    const participants = await tx.conversationParticipant.findMany({
      where: {
        conversationId: targetConversationId,
      },

      select: {
        userId: true,
      },
    });
    return { forwarded, participants };
  });

  await Promise.all(
    participants.map((participant) =>
      invalidateUserConversations(participant.userId),
    ),
  );

  for (const participant of participants) {
    if (participant.userId === currentUserId) {
      continue;
    }

    connectionManager.send(
      participant.userId,
      WebSocketEvents.MESSAGE_NEW,
      forwarded,
    );
  }
  return forwarded;
}

export async function pinMessage(
  currentUserId: string,
  conversationId: string,
  messageId: string,
) {
  await ensureParticipant(currentUserId, conversationId);

  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  if (message.conversationId !== conversationId) {
    throw new Error("Message does not belong to this conversation.");
  }

  if (message.deletedAt) {
    throw new Error("Cannot pin a deleted message.");
  }

  const pinned = await prisma.pinnedMessage.upsert({
    where: {
      conversationId_messageId: {
        conversationId,
        messageId,
      },
    },

    update: {},

    create: {
      conversationId,
      messageId,
      pinnedById: currentUserId,
    },

    include: {
      message: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
    },

    select: {
      userId: true,
    },
  });

  for (const participant of participants) {
    connectionManager.send(
      participant.userId,
      WebSocketEvents.MESSAGE_PINNED,
      pinned,
    );
  }
  return pinned;
}

export async function unpinMessage(
  currentUserId: string,
  conversationId: string,
  messageId: string,
) {
  await ensureParticipant(currentUserId, conversationId);
  const checkMessage = await prisma.pinnedMessage.findMany({
    where: {
      conversationId,
      messageId,
    },
  });
  if (!checkMessage) {
    throw new Error("Pin not found.");
  }
  await prisma.pinnedMessage.delete({
    where: {
      conversationId_messageId: {
        conversationId,
        messageId,
      },
    },
  });
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
    },

    select: {
      userId: true,
    },
  });

  for (const participant of participants) {
    connectionManager.send(
      participant.userId,
      WebSocketEvents.MESSAGE_UNPINNED,
      {
        messageId,
      },
    );
  }
  return {
    success: true,
  };
}

export async function getPinnedMessages(
  currentUserId: string,
  conversationId: string,
) {
  await ensureParticipant(currentUserId, conversationId);
  return prisma.pinnedMessage.findMany({
    where: {
      conversationId,
    },

    include: {
      message: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },

    orderBy: {
      pinnedAt: "desc",
    },
  });
}

export async function searchMessages(
  currentUserId: string,
  conversationId: string,
  query: SearchMessagesQuery,
) {
  await ensureParticipant(currentUserId, conversationId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,

      text: {
        contains: query.search,
        mode: "insensitive",
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: query.limit,

    ...(query.cursor && {
      cursor: {
        id: query.cursor,
      },
      skip: 1,
    }),

    include: {
      sender: {
        select: {
          id: true,
          name: true,
        },
      },

      replyTo: {
        select: {
          id: true,
          text: true,
        },
      },
    },
  });

  return {
    messages,

    nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,

    hasMore: messages.length === query.limit,
  };
}

export async function syncMessages(
  currentUserId: string,
  conversationId: string,
  after: string,
) {
  await ensureParticipant(currentUserId, conversationId);
  const lastMessage = await prisma.message.findUnique({
    where: {
      id: after,
    },
  });

  if (!lastMessage) {
    throw new Error("Reference message not found.");
  }
  const messages = await prisma.message.findMany({
    where: {
      conversationId,

      createdAt: {
        gt: lastMessage.createdAt,
      },
    },

    orderBy: {
      createdAt: "asc",
    },

    include: {
      sender: {
        select: {
          id: true,
          name: true,
        },
      },

      reactions: true,

      reads: true,
    },
  });
  return messages;
}

export async function markMessageDelivered(
  currentUserId: string,
  messageId: string,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  await ensureParticipant(currentUserId, message.conversationId);

  if (message.senderId === currentUserId) {
    return null;
  }

  const existing = await prisma.messageDelivery.findUnique({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUserId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  const delivery = await prisma.messageDelivery.create({
    data: {
      messageId,
      userId: currentUserId,
    },
  });

  connectionManager.send(message.senderId, WebSocketEvents.MESSAGE_DELIVERED, {
    messageId,
    userId: currentUserId,
  });

  return delivery;
}

export async function bookmarkMessage(
  currentUserId: string,
  messageId: string,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  await ensureParticipant(currentUserId, message.conversationId);

  if (message.deletedAt) {
    throw new Error("Cannot bookmark a deleted message.");
  }

  return prisma.messageBookmark.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUserId,
      },
    },

    update: {},

    create: {
      messageId,
      userId: currentUserId,
    },
  });
}

export async function removeBookmark(currentUserId: string, messageId: string) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  await ensureParticipant(currentUserId, message.conversationId);

  await prisma.messageBookmark.delete({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUserId,
      },
    },
  });

  return {
    success: true,
  };
}
export async function getBookmarkedMessages(currentUserId: string) {
  const bookmarks = await prisma.messageBookmark.findMany({
    where: {
      userId: currentUserId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      message: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },

          replyTo: {
            select: {
              id: true,
              text: true,
            },
          },

          reactions: true,
          reads: true,
        },
      },
    },
  });

  return {
    bookmarks,
    total: bookmarks.length,
  };
}
export async function getMessageHistory(
  currentUserId: string,
  messageId: string,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  await ensureParticipant(currentUserId, message.conversationId);

  const history = await prisma.messageEditHistory.findMany({
    where: {
      messageId,
    },

    orderBy: {
      editedAt: "asc",
    },
  });

  return {
    history,
    total: history.length,
  };
}

export async function markMessageAsDelivered(
  currentUserId: string,
  messageId: string,
) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  await ensureParticipant(currentUserId, message.conversationId);

  if (message.senderId === currentUserId) {
    throw new Error("You cannot deliver your own message.");
  }

  const delivery = await prisma.messageDelivery.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUserId,
      },
    },
    create: {
      messageId,
      userId: currentUserId,
    },
    update: {},
  });

  connectionManager.send(message.senderId, WebSocketEvents.MESSAGE_DELIVERED, {
    messageId,
    userId: currentUserId,
    deliveredAt: delivery.deliveredAt,
  });

  return delivery;
}
