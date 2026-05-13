// app/api/history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const pageParam = url.searchParams.get("page");

    const limit = Math.min(Math.max(Number(limitParam ?? 20), 1), 100);
    const page = Math.max(Number(pageParam ?? 1), 1);

    const data = await prisma.conversion.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({ ok: true, data, page, limit });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "خطا در دریافت تاریخچه" }, { status: 500 });
  }
}