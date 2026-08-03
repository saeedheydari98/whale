import {
  GET as getAdminTheme,
  POST as saveAdminTheme,
} from "@/app/api/theme/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return getAdminTheme(request);
}

export async function PUT(request: Request) {
  return saveAdminTheme(request);
}
