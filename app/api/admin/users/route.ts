import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { readWithRetry } from "@/lib/api/read-retry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const users = await readWithRetry(() => prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        walletBalance: true,
        createdAt: true,
        profiles: {
          take: 1,
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
      },
    }));
    return apiOk({ users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return apiServerError("دریافت کاربران انجام نشد.");
  }
}
