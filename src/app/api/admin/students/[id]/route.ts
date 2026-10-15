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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const url = new URL(req.url);
    let permanent = url.searchParams.get("permanent") === "true";

    if (!permanent) {
      try {
        const body = await req.json();
        if (body?.permanent === true) permanent = true;
      } catch {
        // Body is optional for DELETE
      }
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            studentTasks: true,
            reports: true,
            feedbacks: true,
            emailLogs: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    if (permanent) {
      // Execute complete cascading deletion inside an atomic transaction
      await prisma.$transaction(async (tx) => {
        const studentTasks = await tx.studentTask.findMany({
          where: { studentId: id },
          select: { id: true },
        });
        const taskIds = studentTasks.map((st) => st.id);

        // 1. Delete EmailLog entries
        await tx.emailLog.deleteMany({
          where: {
            OR: [
              { studentId: id },
              { studentTaskId: { in: taskIds } },
            ],
          },
        });

        // 2. Delete Feedback entries (AI and Employee)
        await tx.feedback.deleteMany({
          where: { studentId: id },
        });

        // 3. Delete Report submissions
        await tx.report.deleteMany({
          where: { studentId: id },
        });

        // 4. Delete StudentTask assignments
        await tx.studentTask.deleteMany({
          where: { studentId: id },
        });

        // 5. Delete the Student record itself
        await tx.student.delete({
          where: { id },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Student "${student.name}" and all associated reports, submissions, feedback, and tasks have been permanently deleted.`,
        permanent: true,
      });
    }

    // Temporary deactivation (preserves task and submission records)
    const deactivated = await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return NextResponse.json({
      success: true,
      message: "Student account successfully deactivated.",
      student: deactivated,
      permanent: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/admin/students/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
