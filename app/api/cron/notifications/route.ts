import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { runtimeEnv } from "@/lib/env";
import { dispatchNotifications } from "@/lib/notifications/dispatch.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = runtimeEnv("CRON_SECRET");
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || secret.length < 32 || given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 401 });
  try { return Response.json(await dispatchNotifications(prisma)); }
  catch { return Response.json({ error: "Dispatch failed" }, { status: 503 }); }
}
