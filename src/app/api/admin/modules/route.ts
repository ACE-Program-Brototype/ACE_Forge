import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createModuleSchema } from "@/validators/module";

export async function GET() {
  try {
    await requireAdmin();

    const modules = await prisma.module.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            tasks: true,
            students: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, modules });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/modules error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = createModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const newModule = await prisma.module.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, module: newModule });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/modules error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
