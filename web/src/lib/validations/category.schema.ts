import { z } from "zod";

export const categorySchema = z.object({
  slug: z.string().min(1, "Slug 不能為空"),
  name: z.string().min(1, "分類名稱不能為空"),
  showInNav: z.boolean().optional(),
  navOrder: z.number().int().optional(),
});

