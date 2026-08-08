import { z } from "zod";

export const createCallSchema = z.object({
  conversationId: z.string().cuid(),
  receiverId: z.string().cuid(),
});

export type CreateCallInput = z.infer<typeof createCallSchema>;
