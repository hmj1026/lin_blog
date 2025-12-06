import { z } from "zod";

export const tagSchema = z.object({
  slug: z.string().min(1, "Slug 不能為空"),
  name: z.string().min(1, "標籤名稱不能為空"),
});

