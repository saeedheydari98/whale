// app/api/save/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic validation
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
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "خطا در ذخیره" }, { status: 500 });
  }
}