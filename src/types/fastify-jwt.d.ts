import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      phone: string;
    };

    user: {
      sub: string;
      phone: string;
    };
  }
}
