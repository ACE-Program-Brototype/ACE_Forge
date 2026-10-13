import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, AuthError } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await requireStudent();
    const { id } = await params;

    // Check if `id` is studentTaskId or taskId
    const studentTask = await prisma.studentTask.findFirst({
      where: {
        studentId: student.id,
        OR: [{ id }, { taskId: id }],
      },
      include: {
        task: {
          include: {
            module: { select: { id: true, name: true, orderIndex: true } },
          },
        },
        report: {
          select: {
            id: true,
            title: true,
            description: true,
            githubRepoUrl: true,
            status: true,
            submittedAt: true,
            // CRITICAL: NEVER include feedbacks or marks
          },
        },
      },
    });

    if (!studentTask) {
      return NextResponse.json(
        { success: false, error: "Task not found or not assigned to your account." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      studentTask: {
        id: studentTask.id,
        taskId: studentTask.task.id,
        title: studentTask.task.title,
        description: studentTask.task.description,
        referenceLink: studentTask.task.referenceLink,
        module: studentTask.task.module,
        assignedAt: studentTask.assignedAt,
        dueAt: studentTask.dueAt,
        status: studentTask.status,
        report: studentTask.report,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/student/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
