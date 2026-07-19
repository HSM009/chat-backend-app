import type { FastifyInstance } from "fastify";

export async function verifyWebSocketToken(
  app: FastifyInstance,
  token: string,
) {
  const payload = await app.jwt.verify<{
    sub: string;
    phone: string;
  }>(token);

  return payload;
}
