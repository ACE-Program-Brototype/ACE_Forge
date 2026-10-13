import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { employeeGradeSchema } from "@/validators/grading";
import { FeedbackType, ReportStatus, StudentTaskStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = employeeGradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const report = await prisma.report.findFirst({
      where: {
        OR: [{ id }, { studentTaskId: id }],
      },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    const { employeeMarks, comments, finalMarks, strengths, improvements } = parsed.data;

    // Atomically save Employee feedback, update final marks, and move student task to REVIEWED
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert Employee Feedback
      const feedback = await tx.feedback.upsert({
        where: {
          reportId_type: {
            reportId: report.id,
            type: FeedbackType.EMPLOYEE,
          },
        },
        update: {
          marks: employeeMarks,
          comments,
          strengths,
          improvements,
          reviewerAdminId: admin.id,
        },
        create: {
          reportId: report.id,
          taskId: report.taskId,
          studentId: report.studentId,
          type: FeedbackType.EMPLOYEE,
          marks: employeeMarks,
          comments,
          strengths,
          improvements,
          reviewerAdminId: admin.id,
        },
      });

      // 2. Finalize Report
      const updatedReport = await tx.report.update({
        where: { id: report.id },
        data: {
          finalMarks,
          status: ReportStatus.FINALIZED,
        },
      });

      // 3. Mark StudentTask as REVIEWED
      await tx.studentTask.update({
        where: { id: report.studentTaskId },
        data: {
          status: StudentTaskStatus.REVIEWED,
        },
      });

      return { feedback, report: updatedReport };
    });

    return NextResponse.json({
      success: true,
      message: "Report successfully reviewed and graded.",
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/reports/[id]/grade error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
