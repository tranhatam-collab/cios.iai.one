import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().min(1).default("customer-intelligence-os-api"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  LOG_LEVEL: z.string().min(1).default("info"),
  FLOW_WEBHOOK_SECRET: z.string().min(1).optional(),
  AIAGENT_API_URL: z
    .string()
    .url()
    .default("https://api.aiagent.iai.one"),
  AIAGENT_API_KEY: z.string().min(1).optional(),
  FRONTEND_URL: z.string().url().default("https://cios.iai.one"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
