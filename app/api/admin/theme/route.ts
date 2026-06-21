import {
  GET as getAdminTheme,
  POST as saveAdminTheme,
} from "@/app/api/theme/admin/route";
import { rateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  return null;
}

export async function GET(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  return getAdminTheme();
}

export async function PUT(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  return saveAdminTheme(request);
}
