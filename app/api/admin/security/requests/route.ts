import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/api/auth";
import { SUPERADMIN_PHONE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reviewSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "revoke"]).optional(),
  approved: z.boolean().optional(),
});

type AdminRequestWithUser = Awaited<ReturnType<typeof readAdminRequest>>;

async function requireSuperadmin(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (auth.user.username !== SUPERADMIN_PHONE || auth.user.role !== "superadmin") {
    return { ok: false as const, response: apiFail("فقط مدیر ارشد به این بخش دسترسی دارد.", 403) };
  }
  return auth;
}

async function readAdminRequest(id: string) {
  return prisma.adminAccessRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          profiles: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

function toPublicRequest(request: NonNullable<AdminRequestWithUser>) {
  const profile = request.user.profiles[0] ?? null;
  const phone = profile?.phone || request.user.username || request.username;

  return {
    id: request.id,
    username: request.username,
    phone,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    user: {
      id: request.user.id,
      email: request.user.email,
      username: request.user.username,
      name: request.user.name,
      role: request.user.role,
      profile,
    },
  };
}

function actionFromPayload(data: z.infer<typeof reviewSchema>) {
  if (data.action) return data.action;
  return data.approved ? "approve" : "reject";
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireSuperadmin(request);
  if (!auth.ok) return auth.response;

  try {
    const requests = await prisma.adminAccessRequest.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            role: true,
            profiles: {
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });
    return apiOk({ requests: requests.map(toPublicRequest) });
  } catch (error) {
    console.error("Admin access requests GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    if (auth.user.role === "admin" || auth.user.role === "superadmin") {
      return apiOk(
        { request: null, access: { isAdminUnlocked: true } },
        { message: "دسترسی مدیریت برای حساب شما فعال است." }
      );
    }

    const profile = await prisma.customerProfile.findFirst({
      where: { userId: auth.user.id },
      orderBy: { updatedAt: "desc" },
      select: { phone: true },
    });
    const phone = String(profile?.phone || auth.user.username || "").trim();

    if (!phone) {
      return apiFail("برای ثبت درخواست مدیریت باید شماره موبایل حساب شما ثبت شده باشد.", 400);
    }

    const existing = await prisma.adminAccessRequest.findFirst({
      where: { userId: auth.user.id },
      orderBy: { updatedAt: "desc" },
    });

    const saved = existing
      ? await prisma.adminAccessRequest.update({
          where: { id: existing.id },
          data: { username: phone, status: existing.status === "approved" ? "approved" : "pending" },
        })
      : await prisma.adminAccessRequest.create({
          data: {
            userId: auth.user.id,
            username: phone,
            status: "pending",
          },
        });
    const fullRequest = await readAdminRequest(saved.id);
    if (!fullRequest) return apiFail("درخواست مدیریت پیدا نشد.", 404);

    return apiOk(
      { request: toPublicRequest(fullRequest), access: { isAdminUnlocked: false, status: saved.status } },
      { status: existing ? 200 : 201, message: "درخواست مدیریت برای مدیر ارشد ارسال شد." }
    );
  } catch (error) {
    console.error("Admin access requests POST error:", error);
    return apiServerError();
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireSuperadmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, reviewSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const targetRequest = await readAdminRequest(parsed.data.id);
    if (!targetRequest) return apiFail("درخواست مدیریت پیدا نشد.", 404);
    if (targetRequest.user.username === SUPERADMIN_PHONE || targetRequest.user.role === "superadmin") {
      return apiFail("دسترسی مدیر ارشد قابل تغییر نیست.", 400);
    }

    const action = actionFromPayload(parsed.data);
    const nextStatus = action === "approve" ? "approved" : action === "revoke" ? "revoked" : "rejected";

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.adminAccessRequest.update({
        where: { id: targetRequest.id },
        data: { status: nextStatus },
      });

      if (action === "approve") {
        await tx.user.update({
          where: { id: targetRequest.userId },
          data: { role: "admin" },
        });
      }

      if (action === "revoke") {
        await tx.user.updateMany({
          where: { id: targetRequest.userId, role: "admin" },
          data: { role: "user" },
        });
      }
    });

    const updated = await readAdminRequest(targetRequest.id);
    if (!updated) return apiFail("درخواست مدیریت پیدا نشد.", 404);

    return apiOk(
      { request: toPublicRequest(updated) },
      {
        message:
          action === "approve"
            ? "دسترسی مدیریت تایید شد."
            : action === "revoke"
              ? "دسترسی مدیریت لغو شد."
              : "درخواست مدیریت رد شد.",
      }
    );
  } catch (error) {
    console.error("Admin access requests PATCH error:", error);
    return apiServerError();
  }
}
