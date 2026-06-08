import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const pageParam = url.searchParams.get("page");

  const limit = Math.min(Math.max(Number(limitParam ?? 20), 1), 100);
  const page = Math.max(Number(pageParam ?? 1), 1);

  try {
    const data = await prisma.conversion.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json(
      { ok: true, data, page, limit },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, data: [], page, limit },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
