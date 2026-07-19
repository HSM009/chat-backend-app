import { FastifyInstance } from "fastify";

import { loginSchema, registerSchema } from "./auth.schema.js";
import { loginUser, registerUser } from "./auth.service.js";
import { authenticate } from "../../plugins/auth.js";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const user = await registerUser(body);

      return reply.status(201).send(user);
    } catch (error) {
      app.log.error(error);

      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  });

  app.post("/login", async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await loginUser(app, body);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);

      return reply.status(401).send({
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  });

  app.get(
    "/profile",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      console.log("Profile route reached");

      return {
        message: "Profile works",
      };
    },
  );
}
