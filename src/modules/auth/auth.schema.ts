import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(5).max(20),
  password: z.string().min(8).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
