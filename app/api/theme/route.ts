import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ThemeStyle = "light" | "dark" | "fantasy";
type ThemeColor = "green" | "red" | "blue" | "yellow" | "gray" | "orange" | "purple";

type ThemeConfig = {
  primary: ThemeColor;
  style: ThemeStyle;
};

const defaultTheme: ThemeConfig = {
  primary: "gray",
  style: "dark",
};

const THEME_SERVER_CACHE_MS = 30_000;

function isThemeStyle(value: string): value is ThemeStyle {
  return value === "light" || value === "dark" || value === "fantasy";
}

function isThemeColor(value: string): value is ThemeColor {
  return (
    value === "green" ||
    value === "red" ||
    value === "blue" ||
    value === "yellow" ||
    value === "gray" ||
    value === "orange" ||
    value === "purple"
  );
}

const hasThemeModel =
  (prisma as any).adminTheme &&
  typeof (prisma as any).adminTheme.findFirst === "function";

let cachedTheme: { at: number; theme: ThemeConfig } | null = null;
let themeStorageReady = false;

function normalizeTheme(value: Partial<ThemeConfig> | null | undefined): ThemeConfig {
  return {
    primary: isThemeColor(String(value?.primary)) ? value?.primary as ThemeColor : defaultTheme.primary,
    style: isThemeStyle(String(value?.style)) ? value?.style as ThemeStyle : defaultTheme.style,
  };
}

function readCachedTheme() {
  return cachedTheme && Date.now() - cachedTheme.at < THEME_SERVER_CACHE_MS
    ? cachedTheme.theme
    : null;
}

function writeCachedTheme(theme: ThemeConfig) {
  cachedTheme = { at: Date.now(), theme };
}

async function ensureThemeStorage() {
  if (themeStorageReady || !hasThemeModel) return hasThemeModel;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "AdminTheme" (
      "id" SERIAL PRIMARY KEY,
      "primary" TEXT NOT NULL DEFAULT 'gray',
      "style" TEXT NOT NULL DEFAULT 'light',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await prisma.$executeRaw`
    ALTER TABLE "AdminTheme"
    ADD COLUMN IF NOT EXISTS "primary" TEXT NOT NULL DEFAULT 'gray'
  `;
  await prisma.$executeRaw`
    ALTER TABLE "AdminTheme"
    ADD COLUMN IF NOT EXISTS "style" TEXT NOT NULL DEFAULT 'light'
  `;
  await prisma.$executeRaw`
    ALTER TABLE "AdminTheme"
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  `;
  await prisma.$executeRaw`
    ALTER TABLE "AdminTheme"
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  `;
  await prisma.$executeRaw`
    ALTER TABLE "AdminTheme"
    DROP COLUMN IF EXISTS "tone"
  `;

  themeStorageReady = true;
  return true;
}

async function loadTheme() {
  const cached = readCachedTheme();
  if (cached) return cached;

  try {
    if (!hasThemeModel) return defaultTheme;
    const record = await (prisma as any).adminTheme.findFirst();
    const theme = normalizeTheme(record);
    writeCachedTheme(theme);
    return theme;
  } catch {
    return cachedTheme?.theme ?? defaultTheme;
  }
}

function toThemeResponse(theme: ThemeConfig) {
  return NextResponse.json({
    ok: true,
    data: {
      theme,
    },
  });
}

function toThemeSaveErrorResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: "ذخیره تم ناموفق بود.",
      data: {
        theme: cachedTheme?.theme ?? defaultTheme,
      },
    },
    { status: 500 }
  );
}

function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  return null;
}

export async function GET(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  return toThemeResponse(await loadTheme());
}

export async function POST(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Partial<ThemeConfig>;
  const currentTheme = await loadTheme();
  const nextTheme = normalizeTheme({ ...currentTheme, ...body });

  if (!(await ensureThemeStorage().catch(() => false))) {
    writeCachedTheme(nextTheme);
    return toThemeResponse(nextTheme);
  }

  try {
    const existing = await (prisma as any).adminTheme.findFirst();
    const record = existing
      ? await (prisma as any).adminTheme.update({
          where: { id: existing.id },
          data: {
            primary: nextTheme.primary,
            style: nextTheme.style,
            updatedAt: new Date(),
          },
        })
      : await (prisma as any).adminTheme.create({
          data: {
            primary: nextTheme.primary,
            style: nextTheme.style,
          },
        });

    const savedTheme = normalizeTheme(record);
    writeCachedTheme(savedTheme);
    return toThemeResponse(savedTheme);
  } catch (error) {
    console.error("Theme save error:", error);
    return toThemeSaveErrorResponse();
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
