import {
  GET as getTheme,
  POST as saveTheme,
  PUT as updateTheme,
} from "@/app/api/theme/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return getTheme(request);
}

export async function POST(request: Request) {
  return saveTheme(request);
}

export async function PUT(request: Request) {
  return updateTheme(request);
}
