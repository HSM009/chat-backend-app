import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/auth.js";
import {
  pinMessageSchema,
  reactToMessageSchema,
  sendMessageSchema,
  updateMessageSchema,
} from "./message.schema.js";
import {
  deleteMessage,
  getMessages,
  markMessageAsRead,
  reactToMessage,
  updateMessage,
  pinMessage,
  unpinMessage,
  searchMessages,
  syncMessages,
  sendMessage,
  getBookmarkedMessages,
  bookmarkMessage,
  removeBookmark,
  getMessageHistory,
} from "./message.service.js";
import {
  getMessagesQuerySchema,
  searchMessagesQuerySchema,
  syncMessagesQuerySchema,
} from "./message.query.js";

type MessageParams = {
  messageId: string;
};

type ConversationParams = {
  conversationId: string;
};

export default async function messageRoutes(app: FastifyInstance) {
  app.post(
    "/:conversationId/messages",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as ConversationParams;

        const body = sendMessageSchema.parse(request.body);

        const message = await sendMessage(currentUserId, conversationId, body);

        return reply.status(201).send(message);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to send message",
        });
      }
    },
  );
  app.get(
    "/:conversationId/messages",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { conversationId } = request.params as ConversationParams;

        const query = getMessagesQuerySchema.parse(request.query);

        const messages = await getMessages(
          currentUserId,
          conversationId,
          query,
        );

        return reply.send(messages);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Unable to load messages",
        });
      }
    },
  );
  app.get(
    "/:conversationId/search",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { conversationId } = request.params as ConversationParams;

        const query = searchMessagesQuerySchema.parse(request.query);

        const messages = await searchMessages(
          currentUserId,
          conversationId,
          query,
        );

        return reply.send(messages);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Search failed",
        });
      }
    },
  );
  app.get(
    "/:conversationId/sync",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { conversationId } = request.params as ConversationParams;

        const query = syncMessagesQuerySchema.parse(request.query);

        const messages = await syncMessages(
          currentUserId,
          conversationId,
          query.after,
        );

        return reply.send(messages);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Sync failed",
        });
      }
    },
  );
  app.patch(
    "/:messageId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { messageId } = request.params as MessageParams;
        const currentUserId = request.user.sub;

        const body = updateMessageSchema.parse(request.body);

        const message = await updateMessage(currentUserId, messageId, body);

        return reply.send(message);
      } catch (error) {
        app.log.error(error);
        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to update message",
        });
      }
    },
  );
  app.delete(
    "/:messageId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { messageId } = request.params as MessageParams;

        const currentUserId = request.user.sub;
        const message = await deleteMessage(currentUserId, messageId);

        return reply.send(message);
      } catch (error) {
        app.log.error(error);
        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to delete message",
        });
      }
    },
  );
  app.post(
    "/:messageId/reactions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { messageId } = request.params as MessageParams;

        const body = reactToMessageSchema.parse(request.body);

        const reaction = await reactToMessage(currentUserId, messageId, body);

        return reply.status(201).send(reaction);
      } catch (error) {
        app.log.error(error);
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Unable to react",
        });
      }
    },
  );
  app.post(
    "/:messageId/read",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { messageId } = request.params as MessageParams;

        const receipt = await markMessageAsRead(currentUserId, messageId);

        return reply.send(receipt);
      } catch (error) {
        app.log.error(error);
        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Unable to mark message as read",
        });
      }
    },
  );
  app.post(
    "/:messageId/pin",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { messageId } = request.params as MessageParams;

        const body = pinMessageSchema.parse(request.body);

        const pinned = await pinMessage(
          currentUserId,
          body.conversationId,
          messageId,
        );

        return reply.send(pinned);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to pin message",
        });
      }
    },
  );
  app.delete(
    "/:messageId/pin",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;
        const { messageId } = request.params as MessageParams;

        const body = pinMessageSchema.parse(request.body);

        const result = await unpinMessage(
          currentUserId,
          body.conversationId,
          messageId,
        );

        return reply.send(result);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to unpin message",
        });
      }
    },
  );
  app.post(
    "/:messageId/bookmark",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { messageId } = request.params as MessageParams;

        const bookmark = await bookmarkMessage(currentUserId, messageId);

        return reply.status(201).send(bookmark);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Unable to bookmark message",
        });
      }
    },
  );
  app.delete(
    "/:messageId/bookmark",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { messageId } = request.params as MessageParams;

        const result = await removeBookmark(currentUserId, messageId);

        return reply.send(result);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error
              ? error.message
              : "Unable to remove bookmark",
        });
      }
    },
  );
  app.get(
    "/bookmarks",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const bookmarks = await getBookmarkedMessages(currentUserId);

        return reply.send(bookmarks);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Unable to load bookmarks",
        });
      }
    },
  );
  app.get(
    "/:messageId/history",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { messageId } = request.params as MessageParams;

        const history = await getMessageHistory(currentUserId, messageId);

        return reply.send(history);
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Unable to load history",
        });
      }
    },
  );
}
