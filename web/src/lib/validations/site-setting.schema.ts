import { z } from "zod";

export const siteSettingSchema = z.object({
  showBlogLink: z.boolean(),
});
