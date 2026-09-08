import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalText,
  SITE_URL: optionalText,
  NEXT_PUBLIC_SITE_URL: optionalText,
  NEXT_PUBLIC_CATALOG_WS_URL: optionalText,
});

export class MissingAuthSecretError extends Error {
  constructor() {
    super("JWT_SECRET is required in production.");
    this.name = "MissingAuthSecretError";
  }
}

/** Read at call time so Vercel runtime secrets are not frozen from the build machine. */
export function runtimeEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: runtimeEnv("DATABASE_URL"),
  SITE_URL: runtimeEnv("SITE_URL"),
  NEXT_PUBLIC_SITE_URL: runtimeEnv("NEXT_PUBLIC_SITE_URL"),
  NEXT_PUBLIC_CATALOG_WS_URL: runtimeEnv("NEXT_PUBLIC_CATALOG_WS_URL"),
});

export function authSecret() {
  const secret = runtimeEnv("JWT_SECRET") || runtimeEnv("AUTH_SECRET");
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === "development-jwt-secret-change-me") {
      throw new MissingAuthSecretError();
    }
    return secret;
  }
  return secret || "development-jwt-secret-change-me";
}
