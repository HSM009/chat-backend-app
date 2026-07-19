import Fastify from "fastify";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import jwtPlugin from "./plugins/jwt.js";
import websocketPlugin from "./plugins/websocket.js";
import multipartPlugin from "./plugins/multipart.js";
import websocketRoutes from "./websocket/websocket.route.js";
import authRoutes from "./modules/auth/auth.route.js";
import conversationRoutes from "./modules/conversation/conversation.route.js";
import messageRoutes from "./modules/message/message.route.js";
import uploadRoutes from "./modules/upload/upload.route.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(jwtPlugin);
  await app.register(websocketPlugin);
  await app.register(multipartPlugin);

  app.get("/", async () => ({
    status: "ok",
  }));

  await app.register(authRoutes, {
    prefix: "/auth",
  });

  await app.register(conversationRoutes, {
    prefix: "/conversations",
  });

  await app.register(messageRoutes, {
    prefix: "/messages",
  });

  await app.register(websocketRoutes);

  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "uploads"),
    prefix: "/uploads/",
  });

  await app.register(uploadRoutes, {
    prefix: "/uploads",
  });

  console.log(app.printRoutes());

  return app;
}
