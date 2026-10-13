import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { updateStudentSchema } from "@/validators/student";
import { assignModuleTasksToStudent } from "@/services/task-assignment.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        batch: true,
        currentModule: {
          include: {
            tasks: { where: { isActive: true } },
          },
        },
        studentTasks: {
          orderBy: { assignedAt: "desc" },
          include: {
            task: {
              include: {
                module: { select: { id: true, name: true, orderIndex: true } },
              },
            },
            report: {
              include: {
                feedbacks: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    reviewerAdmin: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        emailLogs: {
          orderBy: { sentAt: "desc" },
          take: 10,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/students/[id] error:", error);
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
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const currentStudent = await prisma.student.findUnique({ where: { id } });
    if (!currentStudent) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const moduleChanged =
      parsed.data.currentModuleId &&
      parsed.data.currentModuleId !== currentStudent.currentModuleId;

    const updated = await prisma.student.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email?.toLowerCase(),
        phone: parsed.data.phone,
        batchId: parsed.data.batchId,
        currentModuleId: parsed.data.currentModuleId,
        status: parsed.data.status,
      },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true } },
      },
    });

    // When student changes module, assign tasks from the new module
    if (moduleChanged && updated.currentModuleId && updated.status === "ACTIVE") {
      await assignModuleTasksToStudent(updated.id, updated.currentModuleId);
    }

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/admin/students/[id] error:", error);
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

    // Set to INACTIVE instead of cascade deletion to preserve task/grade history
    const deactivated = await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return NextResponse.json({
      success: true,
      message: "Student account successfully deactivated.",
      student: deactivated,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/admin/students/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
