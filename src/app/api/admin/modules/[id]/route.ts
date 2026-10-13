import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { updateModuleSchema } from "@/validators/module";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const moduleItem = await prisma.module.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            students: true,
            tasks: true,
          },
        },
      },
    });

    if (!moduleItem) {
      return NextResponse.json({ success: false, error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, module: moduleItem });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/modules/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const updated = await prisma.module.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, module: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/admin/modules/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const studentCount = await prisma.student.count({
      where: { currentModuleId: id },
    });

    if (studentCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete module: ${studentCount} active students are currently enrolled.`,
        },
        { status: 400 }
      );
    }

    await prisma.module.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Module deleted successfully" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/admin/modules/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
