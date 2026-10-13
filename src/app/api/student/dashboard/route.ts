import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const student = await requireStudent();

    const fullStudent = await prisma.student.findUnique({
      where: { id: student.id },
      include: {
        batch: { select: { id: true, name: true, startDate: true } },
        currentModule: {
          select: { id: true, name: true, orderIndex: true, description: true },
        },
        studentTasks: {
          orderBy: { dueAt: "asc" },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                referenceLink: true,
                moduleId: true,
              },
            },
            report: {
              select: {
                id: true,
                title: true,
                githubRepoUrl: true,
                status: true,
                submittedAt: true,
                // NOTE: NEVER return feedbacks or finalMarks to students
              },
            },
          },
        },
      },
    });

    if (!fullStudent) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student: {
        id: fullStudent.id,
        name: fullStudent.name,
        email: fullStudent.email,
        phone: fullStudent.phone,
        batch: fullStudent.batch,
        currentModule: fullStudent.currentModule,
      },
      tasks: fullStudent.studentTasks.map((st) => ({
        id: st.id, // studentTaskId
        taskId: st.task.id,
        title: st.task.title,
        description: st.task.description,
        referenceLink: st.task.referenceLink,
        moduleId: st.task.moduleId,
        assignedAt: st.assignedAt,
        dueAt: st.dueAt,
        status: st.status,
        hasReport: !!st.report,
        report: st.report
          ? {
              id: st.report.id,
              title: st.report.title,
              githubRepoUrl: st.report.githubRepoUrl,
              submittedAt: st.report.submittedAt,
              status: st.report.status,
            }
          : null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/student/dashboard error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
