import { FastifyInstance } from "fastify";

import { authenticate } from "../../plugins/auth.js";
import { createCallSchema } from "./call.schema.js";
import { acceptCall, createCall, rejectCall } from "./call.service.js";

export default async function callRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const body = createCallSchema.parse(request.body);

        const call = await createCall(request.user.sub, body);

        return reply.status(201).send(call);
      } catch (error) {
        return reply.status(400).send({
          message: "Failed to create call.",
          error,
        });
      }
    },
  );
  app.post(
    "/:id/accept",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const call = await acceptCall(id);

      return reply.send(call);
    },
  );
  app.post(
    "/:id/reject",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const call = await rejectCall(id);

      return reply.send(call);
    },
  );
}
