import { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    console.error(err);

    return reply.status(401).send({
      message: "Unauthorized",
    });
  }
}
