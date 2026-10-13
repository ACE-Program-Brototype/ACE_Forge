import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createBatchSchema } from "@/validators/batch";

export async function GET() {
  try {
    await requireAdmin();

    const batches = await prisma.batch.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/batches error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = createBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const existing = await prisma.batch.findUnique({
      where: { name: parsed.data.name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A batch with this name already exists." },
        { status: 400 }
      );
    }

    const batch = await prisma.batch.create({
      data: {
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        status: parsed.data.status,
      },
    });

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/batches error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
