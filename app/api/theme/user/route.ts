import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ThemeStyle = "light" | "dark" | "fantasy";
type ThemeColor = "green" | "red" | "blue" | "yellow" | "gray" | "orange" | "purple";
type ThemeDensity = "compact" | "comfortable" | "spacious";

type UserThemeConfig = {
  preferredColor: ThemeColor;
  style: ThemeStyle;
  tone: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
  density: ThemeDensity;
};

const defaultUserTheme: UserThemeConfig = {
  preferredColor: "green",
  style: "light",
  tone: 500,
  density: "comfortable",
};

const hasUserThemeModel =
  prisma.userTheme && typeof prisma.userTheme.findFirst === "function";

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

function isThemeTone(value: unknown): value is UserThemeConfig["tone"] {
  const tone = Number(value);
  return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].includes(tone);
}

function isThemeDensity(value: string): value is ThemeDensity {
  return value === "compact" || value === "comfortable" || value === "spacious";
}

export async function GET() {
  if (!hasUserThemeModel) {
    return NextResponse.json(defaultUserTheme);
  }

  try {
    const record = await prisma.userTheme.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    const theme: UserThemeConfig = record
      ? {
          preferredColor: isThemeColor(record.preferredColor)
            ? record.preferredColor
            : defaultUserTheme.preferredColor,
          style: isThemeStyle(record.style) ? record.style : defaultUserTheme.style,
          tone: isThemeTone(record.tone) ? record.tone : defaultUserTheme.tone,
          density: isThemeDensity(record.density) ? record.density : defaultUserTheme.density,
        }
      : defaultUserTheme;

    return NextResponse.json(theme);
  } catch (error) {
    console.error("User theme GET error:", error);
    return NextResponse.json(defaultUserTheme);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<UserThemeConfig>;

  const nextTheme: UserThemeConfig = {
    preferredColor: isThemeColor(String(body.preferredColor))
      ? (body.preferredColor as ThemeColor)
      : defaultUserTheme.preferredColor,
    style: isThemeStyle(String(body.style))
      ? (body.style as ThemeStyle)
      : defaultUserTheme.style,
    tone: isThemeTone(body.tone) ? body.tone : defaultUserTheme.tone,
    density: isThemeDensity(String(body.density))
      ? (body.density as ThemeDensity)
      : defaultUserTheme.density,
  };

  if (!hasUserThemeModel) {
    return NextResponse.json(nextTheme);
  }

  try {
    const existing = await prisma.userTheme.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const record = existing
      ? await prisma.userTheme.update({
          where: { id: existing.id },
          data: nextTheme,
        })
      : await prisma.userTheme.create({
          data: nextTheme,
        });

    return NextResponse.json({
      preferredColor: record.preferredColor,
      style: record.style,
      tone: record.tone,
      density: record.density,
    } as UserThemeConfig);
  } catch (error) {
    console.error("User theme POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
