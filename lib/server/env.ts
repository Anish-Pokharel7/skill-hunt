import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("veriprice_super_secure_national_ledger_jwt_secret_key_2026"),
  PORT: z.string().optional().default("3000"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
});

export type Env = z.infer<typeof envSchema>;
