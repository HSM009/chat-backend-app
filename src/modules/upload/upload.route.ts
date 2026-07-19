import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { authenticate } from "../../plugins/auth.js";
import { ALLOWED_MIME_TYPES, AllowedMimeType } from "./upload.constants.js";
import { fileTypeFromBuffer } from "file-type";

export default async function uploadRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          message: "No file uploaded.",
        });
      }

      const buffer = await file.toBuffer();
      const detectedType = await fileTypeFromBuffer(buffer);

      if (!detectedType) {
        return reply.status(400).send({
          message: "Unable to determine file type.",
        });
      }

      const allowedMimeTypes = new Set(ALLOWED_MIME_TYPES);

      if (!allowedMimeTypes.has(detectedType.mime as AllowedMimeType)) {
        return reply.status(400).send({
          message: "Unsupported file type.",
        });
      }
      const extension = `.${detectedType.ext}`;

      const filename = `${randomUUID()}${extension}`;

      const filepath = path.resolve("uploads", filename);

      await fs.promises.mkdir("uploads", {
        recursive: true,
      });

      try {
        await fs.promises.writeFile(filepath, buffer);
      } catch (error) {
        app.log.error(error);

        return reply.status(500).send({
          message: "Failed to upload file.",
        });
      }
      const fileUrl = `/uploads/${filename}`;

      return {
        fileUrl,
        fileName: file.filename,
        mimeType: detectedType.mime,
        fileSize: buffer.length,
      };
    },
  );
}
