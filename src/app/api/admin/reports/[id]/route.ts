import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if `id` is reportId or studentTaskId
    const report = await prisma.report.findFirst({
      where: {
        OR: [{ id }, { studentTaskId: id }],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            batch: { select: { id: true, name: true } },
            currentModule: { select: { id: true, name: true, orderIndex: true } },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            referenceLink: true,
            module: { select: { id: true, name: true, orderIndex: true } },
          },
        },
        studentTask: {
          select: {
            id: true,
            assignedAt: true,
            dueAt: true,
            status: true,
          },
        },
        feedbacks: {
          orderBy: { createdAt: "desc" },
          include: {
            reviewerAdmin: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/reports/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
