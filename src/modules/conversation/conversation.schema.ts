import { z } from "zod";
import { ConversationRole } from "../../generated/prisma/enums.js";

export const createConversationSchema = z.object({
  userId: z.string().cuid(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  imageUrl: z.string().url().optional(),

  participants: z.array(z.string().cuid()).min(2),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const addMemberSchema = z.object({
  userId: z.string().cuid(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const renameGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type RenameGroupInput = z.infer<typeof renameGroupSchema>;

export const updateGroupImageSchema = z.object({
  imageUrl: z.string().min(1),
});

export type UpdateGroupImageInput = z.infer<typeof updateGroupImageSchema>;

export const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),

    imageUrl: z.string().optional(),
  })
  .refine((data) => data.name !== undefined || data.imageUrl !== undefined, {
    message: "Nothing to update.",
  });

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const muteConversationSchema = z.object({
  mutedUntil: z.coerce.date().nullable(),
});

export type MuteConversationInput = z.infer<typeof muteConversationSchema>;

export const archiveConversationSchema = z.object({
  archived: z.boolean(),
});

export type ArchiveConversationInput = z.infer<
  typeof archiveConversationSchema
>;

export const searchConversationQuerySchema = z.object({
  search: z.string().trim().min(1),
});

export type SearchConversationQuery = z.infer<
  typeof searchConversationQuerySchema
>;

export const changeMemberRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(ConversationRole),
});

export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(8),
});

export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
