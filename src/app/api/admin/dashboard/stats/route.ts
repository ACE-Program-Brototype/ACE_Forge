import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { StudentTaskStatus } from "@prisma/client";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalStudents,
      activeStudentsHoldingTasks,
      openTasks,
      submittedReports,
      pendingReviews,
      overdueTasks,
      recentReports,
      recentFeedbacks,
      recentStudents,
      moduleBreakdown,
    ] = await Promise.all([
      // Total students
      prisma.student.count(),

      // Active students currently holding open tasks
      prisma.student.count({
        where: {
          status: "ACTIVE",
          studentTasks: { some: { status: StudentTaskStatus.ASSIGNED } },
        },
      }),

      // Open active curriculum tasks
      prisma.task.count({ where: { isActive: true } }),

      // Submitted reports total
      prisma.report.count(),

      // Reports awaiting review/finalization
      prisma.report.count({ where: { status: { not: "FINALIZED" } } }),

      // Overdue tasks
      prisma.studentTask.count({ where: { status: StudentTaskStatus.OVERDUE } }),

      // Recent 5 report submissions
      prisma.report.findMany({
        take: 5,
        orderBy: { submittedAt: "desc" },
        include: {
          student: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      }),

      // Recent 5 evaluations
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          report: { select: { id: true, title: true } },
          student: { select: { id: true, name: true } },
          reviewerAdmin: { select: { id: true, name: true } },
        },
      }),

      // Recent 5 enrolled students
      prisma.student.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { batch: { select: { name: true } } },
      }),

      // Students count by module
      prisma.module.findMany({
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          name: true,
          orderIndex: true,
          _count: { select: { students: true } },
        },
      }),
    ]);

    // Format combined activity timeline
    interface ActivityItem {
      id: string;
      title: string;
      description: string;
      timestamp: string;
      type: "SUBMISSION" | "EVALUATION" | "ENROLLMENT";
      status: "success" | "info" | "pending";
    }

    const activity: ActivityItem[] = [];

    for (const r of recentReports) {
      activity.push({
        id: `rep-${r.id}`,
        title: r.student.name,
        description: `Submitted milestone: "${r.task.title}"`,
        timestamp: r.submittedAt.toISOString(),
        type: "SUBMISSION",
        status: "info",
      });
    }

    for (const f of recentFeedbacks) {
      activity.push({
        id: `fb-${f.id}`,
        title: f.reviewerAdmin?.name || (f.type === "AI" ? "AI Review Engine" : "Faculty Review"),
        description: `Evaluated ${f.student.name}'s report (Score: ${f.marks}/100)`,
        timestamp: f.createdAt.toISOString(),
        type: "EVALUATION",
        status: "success",
      });
    }

    for (const s of recentStudents) {
      activity.push({
        id: `stu-${s.id}`,
        title: s.name,
        description: `Enrolled in ${s.batch.name}`,
        timestamp: s.createdAt.toISOString(),
        type: "ENROLLMENT",
        status: "pending",
      });
    }

    activity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      counts: {
        totalStudents,
        activeStudents: activeStudentsHoldingTasks,
        openTasks,
        submittedReports,
        pendingReviews,
        overdueTasks,
      },
      moduleBreakdown: moduleBreakdown.map((m) => ({
        name: `Week ${m.orderIndex}`,
        fullName: m.name,
        studentCount: m._count.students,
      })),
      recentActivity: activity.slice(0, 8),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/dashboard/stats error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
