import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { updateAdminSchema } from "@/validators/team";
import { Role } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await requireAdmin([Role.SUPER_ADMIN]);
    const { id } = await params;

    const body = await req.json();
    const parsed = updateAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (id === currentAdmin.id && parsed.data.isActive === false) {
      return NextResponse.json(
        { success: false, error: "You cannot deactivate your own administrative account." },
        { status: 400 }
      );
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/admin/team/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
