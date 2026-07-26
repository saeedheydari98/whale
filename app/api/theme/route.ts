import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/rate-limit";

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
  style: "light",
};

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

function normalizeTheme(value: Partial<ThemeConfig> | null | undefined): ThemeConfig {
  return {
    primary: isThemeColor(String(value?.primary)) ? value?.primary as ThemeColor : defaultTheme.primary,
    style: isThemeStyle(String(value?.style)) ? value?.style as ThemeStyle : defaultTheme.style,
  };
}

function toThemeResponse(theme: ThemeConfig) {
  return NextResponse.json({
    ok: true,
    data: {
      theme,
    },
  });
}

function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  return null;
}

export async function GET(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  if (!hasThemeModel) return toThemeResponse(defaultTheme);

  try {
    const record = await (prisma as any).adminTheme.findFirst();
    return toThemeResponse(normalizeTheme(record));
  } catch {
    return toThemeResponse(defaultTheme);
  }
}

export async function POST(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({})) as Partial<ThemeConfig>;
  const nextTheme = normalizeTheme(body);

  if (!hasThemeModel) return toThemeResponse(nextTheme);

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

    return toThemeResponse(normalizeTheme(record));
  } catch (error) {
    console.error("Theme save error:", error);
    return toThemeResponse(nextTheme);
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
