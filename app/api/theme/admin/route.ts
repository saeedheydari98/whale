import { NextResponse } from "next/server";

type ThemeStyle = "light" | "dark" | "fantasy";
type ThemeColor = "green" | "red" | "blue" | "yellow" | "gray" | "orange" | "purple";

type AdminThemeConfig = {
  primary: ThemeColor;
  style: ThemeStyle;
  tone: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
};

const defaultAdminTheme: AdminThemeConfig = {
  primary: "yellow",
  style: "light",
  tone: 500,
};

let inMemoryAdminTheme: AdminThemeConfig = { ...defaultAdminTheme };

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

function isThemeTone(value: unknown): value is AdminThemeConfig["tone"] {
  const tone = Number(value);
  return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].includes(tone);
}

export async function GET() {
  return NextResponse.json({
    ...defaultAdminTheme,
    ...inMemoryAdminTheme,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AdminThemeConfig>;

    const nextTheme: AdminThemeConfig = {
      primary: isThemeColor(String(body.primary))
        ? (body.primary as ThemeColor)
        : inMemoryAdminTheme.primary,
      style: isThemeStyle(String(body.style))
        ? (body.style as ThemeStyle)
        : inMemoryAdminTheme.style,
      tone: isThemeTone(body.tone)
        ? body.tone
        : inMemoryAdminTheme.tone,
    };

    inMemoryAdminTheme = nextTheme;

    return NextResponse.json({
      ok: true,
      theme: inMemoryAdminTheme,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        theme: inMemoryAdminTheme,
      },
      { status: 400 }
    );
  }
}
