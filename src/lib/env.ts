import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SUPER_ADMIN_NAME: z.string().default("ACE Director"),
  SUPER_ADMIN_EMAIL: z.string().email().default("director@aceprogram.org"),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default("SuperSecretAdminPassword123!"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_DEV_MODE: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("ACE Forge <noreply@aceprogram.org>"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
  GITHUB_TOKEN: z.string().optional().default(""),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
  APP_BASE_URL: process.env.APP_BASE_URL,
  EMAIL_DEV_MODE: process.env.EMAIL_DEV_MODE,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_TOKEN ||
    process.env.Gemini_token,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
});
