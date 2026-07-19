import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

import { env } from "../config/env.js";

export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });
});
