import { Router, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import {
  requireAdmin,
  AuthenticatedAdminRequest,
} from "../middleware/auth.js";
import { assignNewTaskToActiveStudents, assignModuleTasksToStudent } from "../services/task-assignment.service.js";
import { sendEmail } from "../services/email.service.js";
import {
  Role,
  StudentStatus,
  StudentTaskStatus,
  ReportStatus,
  FeedbackType,
  EmailType,
  Prisma,
} from "@prisma/client";
import { createBatchSchema, updateBatchSchema } from "../validators/batch.js";
import { createModuleSchema, updateModuleSchema } from "../validators/module.js";
import { createTaskSchema, updateTaskSchema } from "../validators/task.js";
import { createStudentSchema, updateStudentSchema } from "../validators/student.js";
import { createAdminSchema, updateAdminSchema } from "../validators/team.js";
import { employeeGradeSchema } from "../validators/grading.js";

export const adminRouter = Router();

// Apply requireAdmin middleware to all /admin/* routes
adminRouter.use(requireAdmin());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// ==============================================================================
// 1. DASHBOARD & ACTIVE STUDENTS
// ==============================================================================

adminRouter.get("/dashboard/stats", async (_req: Request, res: Response) => {
  try {
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
      prisma.student.count(),
      prisma.student.count({
        where: {
          status: "ACTIVE",
          studentTasks: { some: { status: StudentTaskStatus.ASSIGNED } },
        },
      }),
      prisma.task.count({ where: { isActive: true } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: { not: "FINALIZED" } } }),
      prisma.studentTask.count({ where: { status: StudentTaskStatus.OVERDUE } }),
      prisma.report.findMany({
        take: 5,
        orderBy: { submittedAt: "desc" },
        include: {
          student: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      }),
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          report: { select: { id: true, title: true } },
          student: { select: { id: true, name: true } },
          reviewerAdmin: { select: { id: true, name: true } },
        },
      }),
      prisma.student.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { batch: { select: { name: true } } },
      }),
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

    res.json({
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
    console.error("GET /dashboard/stats error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.get("/active-students", async (_req: Request, res: Response) => {
  try {
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

    res.json({
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
    console.error("GET /active-students error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==============================================================================
// 2. BATCHES CRUD
// ==============================================================================

adminRouter.get("/batches", async (_req: Request, res: Response) => {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { students: true } },
      },
    });
    res.json({ success: true, batches });
  } catch (error) {
    console.error("GET /batches error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.post("/batches", async (req: Request, res: Response) => {
  try {
    const parsed = createBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const existing = await prisma.batch.findUnique({
      where: { name: parsed.data.name },
    });

    if (existing) {
      res.status(400).json({ success: false, error: "A batch with this name already exists." });
      return;
    }

    const batch = await prisma.batch.create({
      data: {
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        status: parsed.data.status,
      },
    });

    res.json({ success: true, batch });
  } catch (error) {
    console.error("POST /batches error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.get("/batches/:id", async (req: Request, res: Response) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            currentModule: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: "Batch not found" });
      return;
    }

    res.json({ success: true, batch });
  } catch (error) {
    console.error("GET /batches/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.patch("/batches/:id", async (req: Request, res: Response) => {
  try {
    const parsed = updateBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const updated = await prisma.batch.update({
      where: { id: req.params.id },
      data: {
        name: parsed.data.name,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        status: parsed.data.status,
      },
    });

    res.json({ success: true, batch: updated });
  } catch (error) {
    console.error("PATCH /batches/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.delete("/batches/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const studentCount = await prisma.student.count({ where: { batchId: id } });

    if (studentCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete batch: ${studentCount} students are currently assigned.`,
      });
      return;
    }

    await prisma.batch.delete({ where: { id } });
    res.json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    console.error("DELETE /batches/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==============================================================================
// 3. MODULES CRUD
// ==============================================================================

adminRouter.get("/modules", async (_req: Request, res: Response) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        tasks: { orderBy: { createdAt: "asc" } },
        _count: { select: { tasks: true, students: true } },
      },
    });
    res.json({ success: true, modules });
  } catch (error) {
    console.error("GET /modules error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.post("/modules", async (req: Request, res: Response) => {
  try {
    const parsed = createModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const newModule = await prisma.module.create({ data: parsed.data });
    res.json({ success: true, module: newModule });
  } catch (error) {
    console.error("POST /modules error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.get("/modules/:id", async (req: Request, res: Response) => {
  try {
    const moduleItem = await prisma.module.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: { orderBy: { createdAt: "asc" } },
        students: {
          select: { id: true, name: true, email: true, status: true, batch: { select: { name: true } } },
        },
      },
    });

    if (!moduleItem) {
      res.status(404).json({ success: false, error: "Module not found" });
      return;
    }

    res.json({ success: true, module: moduleItem });
  } catch (error) {
    console.error("GET /modules/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.put("/modules/:id", async (req: Request, res: Response) => {
  try {
    const parsed = updateModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const updated = await prisma.module.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ success: true, module: updated });
  } catch (error) {
    console.error("PUT /modules/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.delete("/modules/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const studentCount = await prisma.student.count({ where: { currentModuleId: id } });

    if (studentCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete module: ${studentCount} students are currently assigned.`,
      });
      return;
    }

    await prisma.module.delete({ where: { id } });
    res.json({ success: true, message: "Module deleted successfully" });
  } catch (error) {
    console.error("DELETE /modules/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==============================================================================
// 4. TASKS CRUD
// ==============================================================================

adminRouter.get("/tasks", async (req: Request, res: Response) => {
  try {
    const moduleId = req.query.moduleId as string | undefined;
    const tasks = await prisma.task.findMany({
      where: moduleId ? { moduleId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        module: { select: { id: true, name: true, orderIndex: true } },
        _count: { select: { studentTasks: true, reports: true } },
      },
    });
    res.json({ success: true, tasks });
  } catch (error) {
    console.error("GET /tasks error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.post("/tasks", async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
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

    let assignmentsCount = 0;
    if (newTask.isActive) {
      const assignments = await assignNewTaskToActiveStudents(newTask.id, newTask.moduleId);
      assignmentsCount = assignments.length;
    }

    res.json({
      success: true,
      task: newTask,
      assignedStudentsCount: assignmentsCount,
    });
  } catch (error) {
    console.error("POST /tasks error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.get("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        module: { select: { id: true, name: true, orderIndex: true } },
        createdBy: { select: { id: true, name: true, email: true } },
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
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error("GET /tasks/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.patch("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        referenceLink: parsed.data.referenceLink !== undefined ? parsed.data.referenceLink : undefined,
        moduleId: parsed.data.moduleId,
        isActive: parsed.data.isActive,
      },
    });

    res.json({ success: true, task: updated });
  } catch (error) {
    console.error("PATCH /tasks/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.delete("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const reportsCount = await prisma.report.count({ where: { taskId: id } });

    if (reportsCount > 0) {
      await prisma.task.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({
        success: true,
        message: "Task has submitted reports; it was archived and deactivated instead of permanently deleted.",
      });
      return;
    }

    await prisma.task.delete({ where: { id } });
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE /tasks/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==============================================================================
// 5. STUDENTS MANAGEMENT & BULK IMPORT
// ==============================================================================

adminRouter.get("/students", async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim();
    const batchId = req.query.batchId as string | undefined;
    const moduleId = req.query.moduleId as string | undefined;
    const status = req.query.status as StudentStatus | undefined;

    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (batchId) where.batchId = batchId;
    if (moduleId) where.currentModuleId = moduleId;
    if (status && (status === "ACTIVE" || status === "INACTIVE")) {
      where.status = status;
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true, orderIndex: true } },
        _count: { select: { studentTasks: true, reports: true } },
      },
    });

    res.json({ success: true, students });
  } catch (error) {
    console.error("GET /students error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.post("/students", async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.student.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({
        success: false,
        error: "A student with this email address is already enrolled.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.phone, 10);

    const student = await prisma.student.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone,
        passwordHash,
        batchId: parsed.data.batchId,
        currentModuleId: parsed.data.currentModuleId,
        status: StudentStatus.ACTIVE,
        mustChangePassword: true,
        createdById: admin.id,
      },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true } },
      },
    });

    await assignModuleTasksToStudent(student.id, student.currentModuleId);

    const appUrl = env.APP_BASE_URL || "http://localhost:3000";
    const emailBody = `Welcome to ACE Forge, ${student.name}!

Your student portal account has been successfully created.

Portal URL: ${appUrl}/login
Username: ${student.email}
Initial Temporary Password: ${student.phone}

IMPORTANT SECURITY NOTICE:
Your initial temporary password is your registered phone number (${student.phone}).
Upon your initial login, you will be required to establish a private, strong password before accessing your weekly engineering tasks.

Best regards,
ACE Engineering Program Leadership`;

    const emailResult = await sendEmail({
      to: student.email,
      studentId: student.id,
      type: EmailType.WELCOME,
      subject: "Welcome to ACE Forge — Student Portal Access & Credentials",
      text: emailBody,
      html: `<div style="font-family: sans-serif; padding: 24px; color: #002C5F;">
        <h2 style="color: #002C5F;">Welcome to ACE Forge</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>You have been enrolled in <strong>${student.batch.name}</strong> at <strong>${student.currentModule.name}</strong>.</p>
        <div style="background-color: #EEF3F9; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Portal Login:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
          <p style="margin: 0 0 8px 0;"><strong>Username:</strong> ${student.email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${student.phone}</p>
        </div>
        <p style="color: #8C5800; font-size: 13px;">
          ⚠️ <strong>Mandatory First-Login Password Change:</strong> You must change this temporary password immediately upon signing in.
        </p>
      </div>`,
    });

    res.json({
      success: true,
      student,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error("POST /students error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.get("/students/:id", async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        batch: true,
        currentModule: {
          include: {
            tasks: { where: { isActive: true } },
          },
        },
        studentTasks: {
          orderBy: { assignedAt: "desc" },
          include: {
            task: {
              include: {
                module: { select: { id: true, name: true, orderIndex: true } },
              },
            },
            report: {
              include: {
                feedbacks: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    reviewerAdmin: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        emailLogs: {
          orderBy: { sentAt: "desc" },
          take: 10,
        },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error("GET /students/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.patch("/students/:id", async (req: Request, res: Response) => {
  try {
    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const currentStudent = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!currentStudent) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }

    const moduleChanged =
      parsed.data.currentModuleId &&
      parsed.data.currentModuleId !== currentStudent.currentModuleId;

    const updated = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email?.toLowerCase(),
        phone: parsed.data.phone,
        batchId: parsed.data.batchId,
        currentModuleId: parsed.data.currentModuleId,
        status: parsed.data.status,
      },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true } },
      },
    });

    if (moduleChanged && updated.currentModuleId && updated.status === "ACTIVE") {
      await assignModuleTasksToStudent(updated.id, updated.currentModuleId);
    }

    res.json({ success: true, student: updated });
  } catch (error) {
    console.error("PATCH /students/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.delete("/students/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let permanent = req.query.permanent === "true" || req.body?.permanent === true;

    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }

    if (permanent) {
      await prisma.$transaction(async (tx) => {
        const studentTasks = await tx.studentTask.findMany({
          where: { studentId: id },
          select: { id: true },
        });
        const taskIds = studentTasks.map((st) => st.id);

        await tx.emailLog.deleteMany({
          where: {
            OR: [
              { studentId: id },
              { studentTaskId: { in: taskIds } },
            ],
          },
        });

        await tx.feedback.deleteMany({ where: { studentId: id } });
        await tx.report.deleteMany({ where: { studentId: id } });
        await tx.studentTask.deleteMany({ where: { studentId: id } });
        await tx.student.delete({ where: { id } });
      });

      res.json({
        success: true,
        message: `Student "${student.name}" and all associated reports, submissions, feedback, and tasks have been permanently deleted.`,
        permanent: true,
      });
      return;
    }

    const deactivated = await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    res.json({
      success: true,
      message: "Student account successfully deactivated.",
      student: deactivated,
      permanent: false,
    });
  } catch (error) {
    console.error("DELETE /students/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Bulk Import
adminRouter.post("/students/import", upload.single("file"), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const admin = req.admin!;
    if (!req.file) {
      res.status(400).json({ success: false, error: "Please upload a CSV or Excel file." });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      res.status(400).json({ success: false, error: "Spreadsheet contains no sheets." });
      return;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      res.status(400).json({ success: false, error: "The uploaded spreadsheet contains no data rows." });
      return;
    }

    const allBatches = await prisma.batch.findMany();
    const allModules = await prisma.module.findMany();
    const existingEmails = new Set(
      (await prisma.student.findMany({ select: { email: true } })).map((s) => s.email.toLowerCase())
    );

    interface RowError {
      row: number;
      email?: string;
      error: string;
    }

    const errors: RowError[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    const appUrl = env.APP_BASE_URL || "http://localhost:3000";

    // Process in batches of 25 to prevent event loop starvation
    const BATCH_SIZE = 25;
    for (let batchStart = 0; batchStart < rawRows.length; batchStart += BATCH_SIZE) {
      const chunk = rawRows.slice(batchStart, batchStart + BATCH_SIZE);

      for (let i = 0; i < chunk.length; i++) {
        const rowNum = batchStart + i + 2;
        const row = chunk[i];

        const normalized: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normalized[k.trim().toLowerCase()] = String(v ?? "").trim();
        }

        const name = normalized["name"] || normalized["student name"] || normalized["fullname"];
        const email = (normalized["email"] || normalized["student email"])?.toLowerCase();
        const phone = normalized["phone"] || normalized["phone number"] || normalized["mobile"];
        const batchRef = normalized["batch"] || normalized["cohort"];
        const moduleRef = normalized["module"] || normalized["week"];

        if (!name || !email || !phone || !batchRef || !moduleRef) {
          errors.push({
            row: rowNum,
            email: email || "N/A",
            error: "Missing required column(s). Required: name, email, phone, batch, module.",
          });
          continue;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: rowNum, email, error: "Invalid email address format." });
          continue;
        }

        if (existingEmails.has(email)) {
          skippedCount++;
          errors.push({ row: rowNum, email, error: "Email already exists in the system (skipped)." });
          continue;
        }

        const matchedBatch = allBatches.find(
          (b) =>
            b.id === batchRef ||
            b.name.toLowerCase() === batchRef.toLowerCase() ||
            b.name.toLowerCase().includes(batchRef.toLowerCase())
        );

        if (!matchedBatch) {
          errors.push({ row: rowNum, email, error: `Batch "${batchRef}" not found in database.` });
          continue;
        }

        const matchedModule = allModules.find((m) => {
          if (m.id === moduleRef) return true;
          if (m.name.toLowerCase() === moduleRef.toLowerCase()) return true;
          if (m.name.toLowerCase().includes(moduleRef.toLowerCase())) return true;
          const parsedOrder = parseInt(moduleRef.replace(/\D/g, ""), 10);
          return !isNaN(parsedOrder) && m.orderIndex === parsedOrder;
        });

        if (!matchedModule) {
          errors.push({ row: rowNum, email, error: `Module "${moduleRef}" not found in database.` });
          continue;
        }

        try {
          const passwordHash = await bcrypt.hash(phone, 10);
          const student = await prisma.student.create({
            data: {
              name,
              email,
              phone,
              passwordHash,
              batchId: matchedBatch.id,
              currentModuleId: matchedModule.id,
              status: StudentStatus.ACTIVE,
              mustChangePassword: true,
              createdById: admin.id,
            },
          });

          existingEmails.add(email);
          importedCount++;

          await assignModuleTasksToStudent(student.id, matchedModule.id);

          // Dispatch email non-blockingly
          sendEmail({
            to: student.email,
            studentId: student.id,
            type: EmailType.WELCOME,
            subject: "Welcome to ACE Forge — Cohort Enrollment & Temporary Credentials",
            text: `Welcome to ACE Forge, ${student.name}! Login at ${appUrl}/login with username ${student.email} and temporary password ${student.phone}.`,
            html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #002C5F;">Welcome to ACE Forge</h2>
              <p>Hello <strong>${student.name}</strong>,</p>
              <p>You have been enrolled in <strong>${matchedBatch.name}</strong> at <strong>${matchedModule.name}</strong>.</p>
              <p><strong>Login URL:</strong> <a href="${appUrl}/login">${appUrl}/login</a><br>
              <strong>Username:</strong> ${student.email}<br>
              <strong>Temporary Password:</strong> ${student.phone}</p>
              <p style="color: #8C5800;">Note: You must change your password on first login.</p>
            </div>`,
          }).catch((e) => console.error(`Welcome email dispatch error for ${student.email}:`, e));
        } catch (insertErr) {
          console.error(`Row ${rowNum} insert failed:`, insertErr);
          errors.push({ row: rowNum, email, error: "Failed to persist student record in database." });
        }
      }
    }

    res.json({
      success: true,
      summary: {
        totalRows: rawRows.length,
        importedCount,
        skippedCount,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    console.error("POST /students/import error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==============================================================================
// 6. TEAM MANAGEMENT (SUPER_ADMIN ONLY)
// ==============================================================================

adminRouter.get("/team", requireAdmin([Role.SUPER_ADMIN]), async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ success: true, admins });
  } catch (error) {
    console.error("GET /team error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.post("/team", requireAdmin([Role.SUPER_ADMIN]), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const currentAdmin = req.admin!;
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, error: "An administrator with this email already exists." });
      return;
    }

    const temporaryPassword =
      parsed.data.password ||
      `ACE-${Math.random().toString(36).substring(2, 8).toUpperCase()}!${Math.floor(10 + Math.random() * 90)}`;

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: parsed.data.role,
        isActive: true,
        createdById: currentAdmin.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const appUrl = env.APP_BASE_URL || "http://localhost:3000";
    const emailBody = `Hello ${newAdmin.name},

You have been granted administrative privileges on the ACE Forge platform as a ${newAdmin.role}.

Login URL: ${appUrl}/admin/login
Email: ${newAdmin.email}
Temporary Password: ${temporaryPassword}

Please log in and update your credentials immediately upon first access.

Best regards,
ACE Engineering Leadership Team`;

    const emailResult = await sendEmail({
      to: newAdmin.email,
      subject: "Invitation to ACE Forge Admin Portal",
      text: emailBody,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #002C5F;">Welcome to the ACE Forge Team</h2>
        <p>Hello <strong>${newAdmin.name}</strong>,</p>
        <p>You have been assigned the role of <strong>${newAdmin.role}</strong>.</p>
        <p><strong>Login URL:</strong> <a href="${appUrl}/admin/login">${appUrl}/admin/login</a><br>
        <strong>Email:</strong> ${newAdmin.email}<br>
        <strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
        <p style="color: #64748B;">Please change your password after initial sign-in.</p>
      </div>`,
      type: EmailType.OTHER,
    });

    res.json({
      success: true,
      admin: newAdmin,
      temporaryPassword,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error("POST /team error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.patch("/team/:id", requireAdmin([Role.SUPER_ADMIN]), async (req: Request, res: Response) => {
  try {
    const parsed = updateAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const updated = await prisma.admin.update({
      where: { id: req.params.id },
      data: { isActive: parsed.data.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ success: true, admin: updated });
  } catch (error) {
    console.error("PATCH /team/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ==============================================================================
// 7. REPORTS & GRADING
// ==============================================================================

adminRouter.get("/reports", async (req: Request, res: Response) => {
  try {
    const taskId = req.query.taskId as string | undefined;
    const batchId = req.query.batchId as string | undefined;
    const studentId = req.query.studentId as string | undefined;
    const studentTaskId = req.query.studentTaskId as string | undefined;
    const status = req.query.status as ReportStatus | undefined;

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

    res.json({
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
    console.error("GET /reports error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.get("/reports/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

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
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    res.json({ success: true, report });
  } catch (error) {
    console.error("GET /reports/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

adminRouter.post("/reports/:id/grade", async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const admin = req.admin!;
    const id = req.params.id;

    const parsed = employeeGradeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const report = await prisma.report.findFirst({
      where: {
        OR: [{ id }, { studentTaskId: id }],
      },
    });

    if (!report) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    const { employeeMarks, comments, finalMarks, strengths, improvements } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
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

      const updatedReport = await tx.report.update({
        where: { id: report.id },
        data: {
          finalMarks,
          status: ReportStatus.FINALIZED,
        },
      });

      await tx.studentTask.update({
        where: { id: report.studentTaskId },
        data: {
          status: StudentTaskStatus.REVIEWED,
        },
      });

      return { feedback, report: updatedReport };
    });

    res.json({
      success: true,
      message: "Report successfully reviewed and graded.",
      ...result,
    });
  } catch (error) {
    console.error("POST /reports/:id/grade error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
