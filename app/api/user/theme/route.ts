import {
  GET as getUserTheme,
  POST as saveUserTheme,
} from "@/app/api/theme/user/route";
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
  return getUserTheme(request);
}

export async function PUT(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  return saveUserTheme(request);
}
