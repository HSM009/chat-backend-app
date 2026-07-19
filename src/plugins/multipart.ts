import fp from "fastify-plugin";
import multipart from "@fastify/multipart";
import { MAX_FILE_SIZE } from "../modules/upload/upload.constants.js";

export default fp(async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });
});
