import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { StudentTaskStatus } from "@prisma/client";

export async function GET() {
  try {
    await requireAdmin();

    const activeStudents = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        studentTasks: {
          some: { status: StudentTaskStatus.ASSIGNED },
        },
      },
      orderBy: { name: "asc" },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true, orderIndex: true } },
        studentTasks: {
          where: { status: StudentTaskStatus.ASSIGNED },
          orderBy: { dueAt: "asc" },
          include: {
            task: { select: { id: true, title: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      students: activeStudents.map((s) => {
        const earliestDue = s.studentTasks[0]?.dueAt || null;
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          batch: s.batch,
          currentModule: s.currentModule,
          openTaskCount: s.studentTasks.length,
          earliestDueAt: earliestDue,
          openTasks: s.studentTasks.map((st) => ({
            id: st.id,
            taskId: st.task.id,
            title: st.task.title,
            dueAt: st.dueAt,
          })),
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/active-students error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
