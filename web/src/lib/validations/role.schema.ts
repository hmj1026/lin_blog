import { z } from "zod";

export const roleUpsertSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  permissionKeys: z.array(z.string().min(1)).default([]),
});

