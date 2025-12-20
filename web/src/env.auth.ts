import { z } from "zod";

const authEnvSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(1),
});

export const authEnv = authEnvSchema.parse({
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
});

