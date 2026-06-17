import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const record = await prisma.adminSecurity.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ ok: true, data: { code: record?.code ?? "" } });
  } catch (error) {
    console.error("Admin security GET error:", error);
    return NextResponse.json({ ok: false, error: "server error", data: { code: "" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();

  try {
    const existing = await prisma.adminSecurity.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    const record = existing
      ? await prisma.adminSecurity.update({
          where: { id: existing.id },
          data: { code },
        })
      : await prisma.adminSecurity.create({
          data: { code },
        });

    return NextResponse.json({ ok: true, data: { code: record.code } });
  } catch (error) {
    console.error("Admin security POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
