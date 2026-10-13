import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { updateTaskSchema } from "@/validators/task";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        module: {
          select: { id: true, name: true, orderIndex: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        studentTasks: {
          orderBy: { dueAt: "asc" },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
                batch: { select: { id: true, name: true } },
              },
            },
            report: {
              select: {
                id: true,
                title: true,
                status: true,
                finalMarks: true,
                submittedAt: true,
                githubRepoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/tasks/[id] error:", error);
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
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        referenceLink: parsed.data.referenceLink !== undefined ? parsed.data.referenceLink : undefined,
        moduleId: parsed.data.moduleId,
        isActive: parsed.data.isActive,
      },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/admin/tasks/[id] error:", error);
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

    const reportsCount = await prisma.report.count({
      where: { taskId: id },
    });

    if (reportsCount > 0) {
      // Soft deactivate instead of destructive delete to preserve grade integrity
      await prisma.task.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: "Task has submitted reports; it was archived and deactivated instead of permanently deleted.",
      });
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/admin/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
