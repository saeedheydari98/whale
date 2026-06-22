import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import {
  getAuthUser,
} from "@/lib/api/auth";
import {
  readAdminSecurity,
  readFallbackAdminCode,
  toAdminSecurityData,
  upsertAdminSecurityLock,
} from "@/lib/api/admin-security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const unlockSchema = z.object({
  code: z.string().trim().optional().default(""),
  username: z.string().trim().toLowerCase().optional(),
  profile: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    nationalId: z.string().trim().min(1),
    phone: z.string().trim().min(1),
  }).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, unlockSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const security = await readAdminSecurity();
    const adminCode = security.code || readFallbackAdminCode();

    if (!parsed.data.code) {
      const unlocked = await upsertAdminSecurityLock(false);
      return apiOk({
        ...toAdminSecurityData(unlocked),
        access: { isAdminUnlocked: true },
      });
    }

    if (!security.isPanelLocked) {
      return apiOk({
        ...toAdminSecurityData(security),
        access: { isAdminUnlocked: true },
      });
    }

    if (!adminCode || parsed.data.code !== adminCode) {
      return apiFail("invalid admin code", 401);
    }

    const authUser = await getAuthUser(request);
    if (!authUser) return apiFail("sign in is required", 401);

    if (authUser.role === "superadmin" || authUser.role === "admin") {
      return apiOk({
        ...toAdminSecurityData(security),
        access: { isAdminUnlocked: true },
      });
    }

    const username = String(parsed.data.username || authUser.username || "").trim().toLowerCase();
    if (!username || username !== authUser.username) {
      return apiFail("signed-in username is required", 400);
    }

    const requestRecord = await prisma.adminAccessRequest.upsert({
      where: { id: `${authUser.id}-pending-admin-access` },
      update: {
        username,
        status: "pending",
      },
      create: {
        id: `${authUser.id}-pending-admin-access`,
        userId: authUser.id,
        username,
        status: "pending",
      },
    });

    return apiOk({
      ...toAdminSecurityData(security),
      access: { isAdminUnlocked: false, status: requestRecord.status },
    });
  } catch (error) {
    console.error("Admin security unlock error:", error);
    return apiServerError();
  }
}
