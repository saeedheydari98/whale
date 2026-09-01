import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalText,
  JWT_SECRET: optionalText,
  AUTH_SECRET: optionalText,
  SITE_URL: optionalText,
  NEXT_PUBLIC_SITE_URL: optionalText,
  NEXT_PUBLIC_CATALOG_WS_URL: optionalText,
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  AUTH_SECRET: process.env.AUTH_SECRET,
  SITE_URL: process.env.SITE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CATALOG_WS_URL: process.env.NEXT_PUBLIC_CATALOG_WS_URL,
});

export function authSecret() {
  const secret = env.JWT_SECRET || env.AUTH_SECRET;
  if (env.NODE_ENV === "production") {
    if (!secret || secret === "development-jwt-secret-change-me") {
      throw new Error("JWT_SECRET is required in production.");
    }
    return secret;
  }
  return secret || "development-jwt-secret-change-me";
}
