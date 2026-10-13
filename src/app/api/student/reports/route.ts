import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, AuthError } from "@/lib/auth";
import { reportSubmissionSchema } from "@/validators/report";
import { StudentTaskStatus, ReportStatus } from "@prisma/client";
import { triggerAsyncAiReview } from "@/services/ai-review.service";

export async function POST(req: NextRequest) {
  try {
    const student = await requireStudent();

    const body = await req.json();
    const parsed = reportSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { studentTaskId, title, description, githubRepoUrl, aiDeclarationAccepted } = parsed.data;

    const studentTask = await prisma.studentTask.findUnique({
      where: { id: studentTaskId },
      include: { report: true },
    });

    if (!studentTask || studentTask.studentId !== student.id) {
      return NextResponse.json(
        { success: false, error: "Task assignment not found or does not belong to your account." },
        { status: 404 }
      );
    }

    if (studentTask.report) {
      return NextResponse.json(
        {
          success: false,
          error: "A report has already been submitted for this task. Re-submissions are not permitted.",
        },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        studentTaskId: studentTask.id,
        studentId: student.id,
        taskId: studentTask.taskId,
        title,
        description,
        githubRepoUrl,
        aiDeclarationAccepted,
        status: ReportStatus.SUBMITTED,
      },
    });

    await prisma.studentTask.update({
      where: { id: studentTask.id },
      data: { status: StudentTaskStatus.SUBMITTED },
    });

    // Trigger async AI review in the background (non-blocking)
    triggerAsyncAiReview(report.id).catch((err) => {
      console.error(`Background AI review trigger error for report ${report.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        submittedAt: report.submittedAt,
        status: report.status,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/student/reports error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
