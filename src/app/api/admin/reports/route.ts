import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ReportStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const batchId = searchParams.get("batchId");
    const studentId = searchParams.get("studentId");
    const studentTaskId = searchParams.get("studentTaskId");
    const status = searchParams.get("status") as ReportStatus | null;

    const where: Prisma.ReportWhereInput = {};

    if (taskId) where.taskId = taskId;
    if (studentId) where.studentId = studentId;
    if (studentTaskId) where.studentTaskId = studentTaskId;
    if (status && Object.values(ReportStatus).includes(status)) {
      where.status = status;
    }
    if (batchId) {
      where.student = { batchId };
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            batch: { select: { id: true, name: true } },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            module: { select: { id: true, name: true, orderIndex: true } },
          },
        },
        feedbacks: {
          select: {
            id: true,
            type: true,
            marks: true,
            comments: true,
            reviewerAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      reports: reports.map((r) => {
        const aiFb = r.feedbacks.find((f) => f.type === "AI");
        const empFb = r.feedbacks.find((f) => f.type === "EMPLOYEE");
        return {
          id: r.id,
          studentTaskId: r.studentTaskId,
          title: r.title,
          githubRepoUrl: r.githubRepoUrl,
          status: r.status,
          finalMarks: r.finalMarks,
          submittedAt: r.submittedAt,
          student: r.student,
          task: r.task,
          aiMarks: aiFb?.marks ?? null,
          employeeMarks: empFb?.marks ?? null,
          reviewerAdmin: empFb?.reviewerAdmin ?? null,
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/reports error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
