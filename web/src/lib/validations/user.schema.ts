import { z } from "zod";

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  roleId: z.string().cuid().optional(),
});
