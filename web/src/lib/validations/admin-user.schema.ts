import { z } from "zod";

export const adminUserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  roleId: z.string().cuid(),
});

export const adminUserUpdateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  name: z.string().optional().nullable(),
  roleId: z.string().cuid(),
});
