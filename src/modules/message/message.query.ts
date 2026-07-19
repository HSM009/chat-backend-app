import { z } from "zod";

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),

  cursor: z.string().cuid().optional(),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;

// export const searchMessagesQuerySchema = z.object({
//   q: z.string().trim().min(1),
//   limit: z.coerce.number().int().min(1).max(100).default(20),
// });

// export type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>;

export const syncMessagesQuerySchema = z.object({
  after: z.string().cuid(),
});

// export type SyncMessagesQuery = z.infer<typeof syncMessagesQuerySchema>;

export const searchMessagesQuerySchema = z.object({
  conversationId: z.string().cuid(),

  search: z.string().trim().min(1),

  limit: z.coerce.number().min(1).max(50).default(20),

  cursor: z.string().cuid().optional(),
});

export type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>;
