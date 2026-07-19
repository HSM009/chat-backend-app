import { z } from "zod";
import { MessageType } from "../../generated/prisma/enums.js";

export const sendMessageSchema = z
  .object({
    type: z.enum(MessageType),
    text: z.string().trim().optional(),
    fileUrl: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
    replyToId: z.string().cuid().optional(),
    mentions: z.array(z.string().cuid()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === MessageType.TEXT && !data.text) {
      ctx.addIssue({
        code: "custom",
        message: "Text is required for text messages.",
        path: ["text"],
      });
    }

    if (data.type !== MessageType.TEXT && !data.fileUrl) {
      ctx.addIssue({
        code: "custom",
        message: "File URL is required.",
        path: ["fileUrl"],
      });
    }
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const updateMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

export const reactToMessageSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export type ReactToMessageInput = z.infer<typeof reactToMessageSchema>;

export const forwardMessageSchema = z.object({
  targetConversationId: z.string().cuid(),
});

export type ForwardMessageInput = z.infer<typeof forwardMessageSchema>;

export const pinMessageSchema = z.object({
  conversationId: z.string().cuid(),
});

export type PinMessageInput = z.infer<typeof pinMessageSchema>;
