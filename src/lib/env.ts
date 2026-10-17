import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  BACKEND_API_URL: z.string().default("http://localhost:4000"),
  NEXT_PUBLIC_API_URL: z.string().default(""),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters")
    .default("ace-forge-super-secret-development-jwt-key-2026-very-secure"),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
});
