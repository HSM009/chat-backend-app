import { prisma } from "../../config/prisma.js";
import { connectionManager } from "../../websocket/connection-manager.js";
import { WebSocketEvents } from "../../websocket/events.js";
import { ensureParticipant } from "./conversation.helpers.js";
import {
  AddMemberInput,
  ArchiveConversationInput,
  CreateConversationInput,
  CreateGroupInput,
  MuteConversationInput,
  RenameGroupInput,
  SearchConversationQuery,
  UpdateGroupImageInput,
  UpdateGroupInput,
} from "./conversation.schema.js";

export async function createConversation(
  currentUserId: string,
  data: CreateConversationInput,
) {
  if (currentUserId === data.userId) {
    throw new Error("You cannot create a conversation with yourself.");
  }

  const otherUser = await prisma.user.findUnique({
    where: {
      id: data.userId,
    },
  });

  if (!otherUser) {
    throw new Error("User not found.");
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        {
          participants: {
            some: {
              userId: currentUserId,
            },
          },
        },
        {
          participants: {
            some: {
              userId: data.userId,
            },
          },
        },
      ],
    },
  });

  if (existingConversation) {
    return existingConversation;
  }

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {},
    });

    await tx.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          userId: currentUserId,
        },
        {
          conversationId: conversation.id,
          userId: data.userId,
        },
      ],
    });

    return conversation;
  });
}

export async function getMyConversations(currentUserId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId: currentUserId,
          archivedAt: null,
        },
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              isOnline: true,
            },
          },
        },
      },
    },
  });

  const result = await Promise.all(
    conversations.map(async (conversation) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: {
            not: currentUserId,
          },
          deletedAt: null,
          reads: {
            none: {
              userId: currentUserId,
            },
          },
        },
      });

      return {
        ...conversation,
        unreadCount,
      };
    }),
  );

  return result;
}

async function ensureAdmin(currentUserId: string, conversationId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: currentUserId,
      },
    },
  });

  if (!participant) {
    throw new Error("You are not a participant.");
  }

  if (participant.role !== "ADMIN") {
    throw new Error("Only admins can perform this action.");
  }

  return participant;
}

export async function createGroupConversation(
  currentUserId: string,
  data: CreateGroupInput,
) {
  const participants = [...new Set(data.participants)];

  const filteredParticipants = participants.filter(
    (id) => id !== currentUserId,
  );
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        title: data.title,

        isGroup: true,
      },
    });
    await tx.conversationParticipant.create({
      data: {
        conversationId: conversation.id,

        userId: currentUserId,

        role: "ADMIN",
      },
    });
    await tx.conversationParticipant.createMany({
      data: filteredParticipants.map((userId) => ({
        conversationId: conversation.id,

        userId,

        role: "MEMBER",
      })),
    });
    return tx.conversation.findUnique({
      where: {
        id: conversation.id,
      },

      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  });
}

export async function addMember(
  currentUserId: string,
  conversationId: string,
  data: AddMemberInput,
) {
  await ensureAdmin(currentUserId, conversationId);

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (!conversation.isGroup) {
    throw new Error("Cannot add members to a direct conversation.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: data.userId,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const existing = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: data.userId,
      },
    },
  });

  if (existing) {
    throw new Error("User is already a member.");
  }

  const participant = await prisma.conversationParticipant.create({
    data: {
      conversationId,
      userId: data.userId,
      role: "MEMBER",
    },

    include: {
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

  for (const member of participants) {
    connectionManager.send(
      member.userId,
      WebSocketEvents.MEMBER_ADDED,
      participant,
    );
  }

  return participant;
}

export async function removeMember(
  currentUserId: string,
  conversationId: string,
  targetUserId: string,
) {
  await ensureAdmin(currentUserId, conversationId);
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }
  if (!conversation.isGroup) {
    throw new Error("Cannot remove members from a direct conversation.");
  }
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: targetUserId,
      },
    },
  });

  if (!participant) {
    throw new Error("Member not found.");
  }
  if (targetUserId === currentUserId) {
    throw new Error("Use the leave endpoint instead.");
  }
  if (participant.role === "ADMIN") {
    const adminCount = await prisma.conversationParticipant.count({
      where: {
        conversationId,
        role: "ADMIN",
      },
    });
    if (adminCount === 1) {
      throw new Error("Cannot remove the last admin.");
    }
  }
  const participants = await prisma.$transaction(async (tx) => {
    await tx.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
    });

    return tx.conversationParticipant.findMany({
      where: {
        conversationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  const payload = {
    conversationId,
    removedUserId: targetUserId,
    removedBy: currentUserId,
  };

  for (const member of participants) {
    connectionManager.send(
      member.userId,
      WebSocketEvents.MEMBER_REMOVED,
      payload,
    );
  }
  connectionManager.send(targetUserId, WebSocketEvents.MEMBER_REMOVED, payload);

  return participants;
}

export async function leaveGroup(
  currentUserId: string,
  conversationId: string,
) {
  const participant = await ensureParticipant(currentUserId, conversationId);

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (!conversation.isGroup) {
    throw new Error("Cannot leave a direct conversation.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    const remaining = await tx.conversationParticipant.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    if (remaining.length === 0) {
      await tx.conversation.delete({
        where: {
          id: conversationId,
        },
      });

      return {
        deleted: true,
        remaining,
        newAdminId: null,
      };
    }

    let newAdminId: string | null = null;

    if (participant.role === "ADMIN") {
      const nextAdmin = remaining[0];

      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: nextAdmin.userId,
          },
        },
        data: {
          role: "ADMIN",
        },
      });

      newAdminId = nextAdmin.userId;
    }

    return {
      deleted: false,
      remaining,
      newAdminId,
    };
  });

  if (result.deleted) {
    connectionManager.send(currentUserId, WebSocketEvents.GROUP_DELETED, {
      conversationId,
    });

    return;
  }

  for (const member of result.remaining) {
    connectionManager.send(member.userId, WebSocketEvents.GROUP_LEFT, {
      conversationId,
      userId: currentUserId,
    });
  }

  connectionManager.send(currentUserId, WebSocketEvents.GROUP_LEFT, {
    conversationId,
    userId: currentUserId,
  });

  if (result.newAdminId) {
    for (const member of result.remaining) {
      connectionManager.send(member.userId, WebSocketEvents.ADMIN_CHANGED, {
        conversationId,
        newAdminId: result.newAdminId,
      });
    }
  }

  return result;
}

export async function renameGroup(
  currentUserId: string,
  conversationId: string,
  data: RenameGroupInput,
) {
  await ensureAdmin(currentUserId, conversationId);
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });
  if (!conversation) {
    throw new Error("Conversation not found.");
  }
  if (!conversation.isGroup) {
    throw new Error("Cannot rename a direct conversation.");
  }
  const updated = await prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data: {
      name: data.name,
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
  const payload = {
    conversationId,
    name: updated.name,
    updatedBy: currentUserId,
  };

  for (const participant of participants) {
    connectionManager.send(
      participant.userId,
      WebSocketEvents.GROUP_UPDATED,
      payload,
    );
  }
  return updated;
}

export async function updateGroupImage(
  currentUserId: string,
  conversationId: string,
  data: UpdateGroupImageInput,
) {
  await ensureAdmin(currentUserId, conversationId);
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (!conversation.isGroup) {
    throw new Error("Cannot update image for a direct conversation.");
  }
  const updated = await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      imageUrl: data.imageUrl,
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
  const payload = {
    conversationId,
    imageUrl: updated.imageUrl,
    updatedBy: currentUserId,
  };

  for (const participant of participants) {
    connectionManager.send(
      participant.userId,
      WebSocketEvents.GROUP_UPDATED,
      payload,
    );
  }
  return updated;
}

export async function updateGroup(
  currentUserId: string,
  conversationId: string,
  data: UpdateGroupInput,
) {
  await ensureAdmin(currentUserId, conversationId);
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (!conversation.isGroup) {
    throw new Error("Cannot update direct conversation.");
  }
  const updated = await prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data,
  });
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
    },

    select: {
      userId: true,
    },
  });
  const payload = {
    conversationId,
    updatedBy: currentUserId,
    changes: data,
  };
  for (const participant of participants) {
    connectionManager.send(
      participant.userId,
      WebSocketEvents.GROUP_UPDATED,
      payload,
    );
  }
  return updated;
}

export async function muteConversation(
  currentUserId: string,
  conversationId: string,
  data: MuteConversationInput,
) {
  await ensureParticipant(currentUserId, conversationId);
  const participant = await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId: currentUserId,
      },
    },
    data: {
      mutedUntil: data.mutedUntil,
    },
  });
  return participant;
}

export async function archiveConversation(
  currentUserId: string,
  conversationId: string,
  data: ArchiveConversationInput,
) {
  await ensureParticipant(currentUserId, conversationId);
  const participant = await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId: currentUserId,
      },
    },
    data: {
      archivedAt: data.archived ? new Date() : null,
    },
  });

  return participant;
}

export async function searchConversations(
  currentUserId: string,
  query: SearchConversationQuery,
) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId: currentUserId,
        },
      },

      OR: [
        {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },

        {
          participants: {
            some: {
              user: {
                name: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      ],
    },
  });
  return conversations;
}
export async function getUnreadCount(
  currentUserId: string,
  conversationId: string,
) {
  await ensureParticipant(currentUserId, conversationId);
  const count = await prisma.message.count({
    where: {
      conversationId,

      senderId: {
        not: currentUserId,
      },

      reads: {
        none: {
          userId: currentUserId,
        },
      },

      deletedAt: null,
    },
  });
  return {
    unreadCount: count,
  };
}
