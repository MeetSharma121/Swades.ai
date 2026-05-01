import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(8787)
});

export const env = envSchema.parse(process.env);
