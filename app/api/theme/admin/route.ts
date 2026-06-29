import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ThemeStyle = "light" | "dark" | "fantasy";
type ThemeColor = "green" | "red" | "blue" | "yellow" | "gray" | "orange" | "purple";

type AdminThemeConfig = {
  primary: ThemeColor;
  style: ThemeStyle;
};

const defaultAdminTheme: AdminThemeConfig = {
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

const hasAdminThemeModel =
  (prisma as any).adminTheme &&
  typeof (prisma as any).adminTheme.findFirst === "function";

function toThemeResponse(theme: AdminThemeConfig) {
  return NextResponse.json({
    ok: true,
    data: {
      theme,
    },
  });
}

export async function GET() {
  if (!hasAdminThemeModel) {
    // No Prisma model available (dev, no migrate/generate) → just return default
    return toThemeResponse(defaultAdminTheme);
  }

  try {
    const record = await (prisma as any).adminTheme.findFirst();
    const theme: AdminThemeConfig = record
      ? {
          primary: isThemeColor(String(record.primary))
            ? (record.primary as ThemeColor)
            : defaultAdminTheme.primary,
          style: isThemeStyle(String(record.style))
            ? (record.style as ThemeStyle)
            : defaultAdminTheme.style,
        }
      : defaultAdminTheme;

    return toThemeResponse(theme);
  } catch {
    return toThemeResponse(defaultAdminTheme);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AdminThemeConfig>;

  const nextTheme: AdminThemeConfig = {
    primary: isThemeColor(String(body.primary))
      ? (body.primary as ThemeColor)
      : defaultAdminTheme.primary,
    style: isThemeStyle(String(body.style))
      ? (body.style as ThemeStyle)
      : defaultAdminTheme.style,
  };

  // If Prisma client doesn't have AdminTheme (no migrate/generate), just echo back.
  if (!hasAdminThemeModel) {
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

    return toThemeResponse({
      primary: record.primary,
      style: record.style,
    } as AdminThemeConfig);
  } catch (error) {
    console.error("Theme POST error:", error);
    // Fallback: don't break UI, just return validated input
    return toThemeResponse(nextTheme);
  }
}
