import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createTaskSchema } from "@/validators/task";
import { assignNewTaskToActiveStudents } from "@/services/task-assignment.service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    const tasks = await prisma.task.findMany({
      where: moduleId ? { moduleId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        module: {
          select: { id: true, name: true, orderIndex: true },
        },
        _count: {
          select: {
            studentTasks: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/tasks error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const newTask = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        referenceLink: parsed.data.referenceLink || null,
        moduleId: parsed.data.moduleId,
        isActive: parsed.data.isActive ?? true,
        createdById: admin.id,
      },
      include: {
        module: { select: { id: true, name: true } },
      },
    });

    // Automatically create StudentTask rows for active students in this module with dueAt = assignedAt + 7 days
    let assignmentsCount = 0;
    if (newTask.isActive) {
      const assignments = await assignNewTaskToActiveStudents(newTask.id, newTask.moduleId);
      assignmentsCount = assignments.length;
    }

    return NextResponse.json({
      success: true,
      task: newTask,
      assignedStudentsCount: assignmentsCount,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/tasks error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
