import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return apiFail("برای ارسال درخواست مدیریت ابتدا وارد حساب شوید.", 401);

    if (authUser.role === "superadmin" || authUser.role === "admin") {
      return apiOk({
        security: { hasCode: false, isPanelLocked: false },
        access: { isAdminUnlocked: true },
      });
    }

    const profile = await prisma.customerProfile.findFirst({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
      select: { phone: true },
    });
    const phone = String(profile?.phone || authUser.username || "").trim();

    if (!phone) {
      return apiFail("برای ثبت درخواست مدیریت باید شماره موبایل حساب شما ثبت شده باشد.", 400);
    }

    const existing = await prisma.adminAccessRequest.findFirst({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
    });
    const requestRecord = existing
      ? await prisma.adminAccessRequest.update({
          where: { id: existing.id },
          data: { username: phone, status: existing.status === "approved" ? "approved" : "pending" },
        })
      : await prisma.adminAccessRequest.create({
          data: {
            userId: authUser.id,
            username: phone,
            status: "pending",
          },
        });

    return apiOk({
      security: { hasCode: false, isPanelLocked: false },
      access: { isAdminUnlocked: false, status: requestRecord.status },
    }, { message: "درخواست مدیریت برای مدیر ارشد ارسال شد." });
  } catch (error) {
    console.error("Admin access request compatibility error:", error);
    return apiServerError();
  }
}
