import { FastifyInstance } from "fastify";

import { authenticate } from "../../plugins/auth.js";
import {
  addMemberSchema,
  archiveConversationSchema,
  changeMemberRoleSchema,
  createConversationSchema,
  createGroupSchema,
  joinGroupSchema,
  muteConversationSchema,
  renameGroupSchema,
  searchConversationQuerySchema,
  updateGroupImageSchema,
  updateGroupSchema,
} from "./conversation.schema.js";
import {
  addMember,
  archiveConversation,
  changeMemberRole,
  createConversation,
  createGroupConversation,
  deleteConversation,
  generateInvite,
  getMyConversations,
  getUnreadCount,
  joinGroupByInvite,
  leaveGroup,
  muteConversation,
  removeMember,
  renameGroup,
  searchConversations,
  updateGroup,
  updateGroupImage,
} from "./conversation.service.js";
import { getPinnedMessages } from "../message/message.service.js";
import { ConversationRole } from "../../generated/prisma/enums.js";
type ConversationParams = {
  conversationId: string;
};
export default async function conversationRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const body = createConversationSchema.parse(request.body);

      // Temporary until we type request.user properly
      const currentUserId = (request.user as { sub: string }).sub;

      const conversation = await createConversation(currentUserId, body);

      return reply.send(conversation);
    },
  );
  app.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const currentUserId = (request.user as { sub: string }).sub;

      const conversations = await getMyConversations(currentUserId);

      return reply.send(conversations);
    },
  );
  app.get(
    "/:conversationId/pins",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = (request.user as { sub: string }).sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const pinnedMessages = await getPinnedMessages(
          currentUserId,
          conversationId,
        );

        return reply.send(pinnedMessages);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to load pinned messages",
        });
      }
    },
  );
  app.post(
    "/group",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = (request.user as { sub: string }).sub;

        const body = createGroupSchema.parse(request.body);

        const conversation = await createGroupConversation(currentUserId, body);

        return reply.status(201).send(conversation);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to create group",
        });
      }
    },
  );
  app.post(
    "/:conversationId/members",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = (request.user as { sub: string }).sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = addMemberSchema.parse(request.body);

        const participant = await addMember(
          currentUserId,
          conversationId,
          body,
        );

        return reply.status(201).send(participant);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to add member",
        });
      }
    },
  );
  app.delete(
    "/:conversationId/members/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = (request.user as { sub: string }).sub;

        const { conversationId, userId } = request.params as {
          conversationId: string;
          userId: string;
        };

        await removeMember(currentUserId, conversationId, userId);

        return reply.status(204).send();
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to remove member",
        });
      }
    },
  );
  app.post(
    "/:conversationId/leave",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        await leaveGroup(currentUserId, conversationId);

        return reply.status(204).send();
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to leave group",
        });
      }
    },
  );
  app.patch(
    "/:conversationId/name",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = renameGroupSchema.parse(request.body);

        const conversation = await renameGroup(
          currentUserId,
          conversationId,
          body,
        );

        return reply.send(conversation);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to rename group",
        });
      }
    },
  );
  app.patch(
    "/:conversationId/image",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = updateGroupImageSchema.parse(request.body);

        const conversation = await updateGroupImage(
          currentUserId,
          conversationId,
          body,
        );

        return reply.send(conversation);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to update group image",
        });
      }
    },
  );
  app.patch(
    "/:conversationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = updateGroupSchema.parse(request.body);

        const conversation = await updateGroup(
          currentUserId,
          conversationId,
          body,
        );

        return reply.send(conversation);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to update group.",
        });
      }
    },
  );
  app.patch(
    "/:conversationId/mute",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = muteConversationSchema.parse(request.body);

        const participant = await muteConversation(
          currentUserId,
          conversationId,
          body,
        );

        return reply.send(participant);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to update conversation mute status.",
        });
      }
    },
  );
  app.patch(
    "/:conversationId/archive",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = archiveConversationSchema.parse(request.body);

        const participant = await archiveConversation(
          currentUserId,
          conversationId,
          body,
        );

        return reply.send(participant);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to archive conversation.",
        });
      }
    },
  );
  app.get(
    "/search",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const query = searchConversationQuerySchema.parse(request.query);

        const conversations = await searchConversations(currentUserId, query);

        return reply.send(conversations);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Search failed.",
        });
      }
    },
  );
  app.get(
    "/:conversationId/unread-count",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const unread = await getUnreadCount(currentUserId, conversationId);

        return reply.send(unread);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to get unread count.",
        });
      }
    },
  );
  app.delete(
    "/:conversationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as ConversationParams;

        const result = await deleteConversation(currentUserId, conversationId);

        return reply.send(result);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete conversation",
        });
      }
    },
  );
  app.post(
    "/:conversationId/role",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const body = changeMemberRoleSchema.parse(request.body);

        const result = await changeMemberRole(
          currentUserId,
          conversationId,
          body.userId,
          body.role,
        );

        return reply.send(result);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to change member role.",
        });
      }
    },
  );
  app.post(
    "/:conversationId/invite",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as {
          conversationId: string;
        };

        const invite = await generateInvite(currentUserId, conversationId);

        return reply.send(invite);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate invite.",
        });
      }
    },
  );
  app.post(
    "/join",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const body = joinGroupSchema.parse(request.body);

        const participant = await joinGroupByInvite(currentUserId, body);

        return reply.send(participant);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to join group.",
        });
      }
    },
  );
}
