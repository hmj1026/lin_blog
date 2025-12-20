import { z } from "zod";

const publicEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_UPLOAD_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_UPLOAD_BASE_URL: process.env.NEXT_PUBLIC_UPLOAD_BASE_URL,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
});

