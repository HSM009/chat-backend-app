import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/auth.js";
import { startTyping, stopTyping } from "./presence.service.js";

type ConversationParams = {
  conversationId: string;
};

export default async function presenceRoutes(app: FastifyInstance) {
  app.post(
    "/:conversationId/typing/start",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as ConversationParams;

        await startTyping(currentUserId, conversationId);

        return reply.status(204).send();
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to start typing",
        });
      }
    },
  );

  app.post(
    "/:conversationId/typing/stop",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const currentUserId = request.user.sub;

        const { conversationId } = request.params as ConversationParams;

        await stopTyping(currentUserId, conversationId);

        return reply.status(204).send();
      } catch (error) {
        app.log.error(error);

        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to stop typing",
        });
      }
    },
  );
}
