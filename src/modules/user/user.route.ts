import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/auth.js";
import { getUsers } from "./user.service.js";

export default async function userRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const currentUserId = (request.user as { sub: string }).sub;

      const users = await getUsers(currentUserId);

      return reply.send(users);
    },
  );
}
