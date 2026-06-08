import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const date = String(body.date ?? "");
    const fromType = String(body.fromType ?? "");
    const toType = String(body.toType ?? "");
    const result = String(body.result ?? "");

    if (!date || !fromType || !toType || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const saved = await prisma.conversion.create({
      data: {
        date,
        fromType,
        toType,
        result,
      },
    });

    return NextResponse.json({ ok: true, saved });
  } catch {
    return NextResponse.json({ ok: false, saved: null });
  }
}
