import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireStudent, AuthenticatedStudentRequest } from "../middleware/auth.js";
import { reportSubmissionSchema } from "../validators/report.js";
import { StudentTaskStatus, ReportStatus } from "@prisma/client";
import { queueService } from "../services/queue.service.js";

export const studentRouter = Router();

// Enforce student authentication for all student routes
studentRouter.use(requireStudent());

// 1. Student Dashboard
studentRouter.get("/dashboard", async (req: AuthenticatedStudentRequest, res: Response) => {
  try {
    const student = req.student!;

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
                // CRITICAL SECURITY RULE: NEVER return feedbacks or finalMarks to students
              },
            },
          },
        },
      },
    });

    if (!fullStudent) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }

    res.json({
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
    console.error("GET /student/dashboard error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 2. Student Task Details
studentRouter.get("/tasks/:id", async (req: AuthenticatedStudentRequest, res: Response) => {
  try {
    const student = req.student!;
    const id = req.params.id;

    const studentTask = await prisma.studentTask.findFirst({
      where: {
        studentId: student.id,
        OR: [{ id }, { taskId: id }],
      },
      include: {
        task: {
          include: {
            module: { select: { id: true, name: true, orderIndex: true } },
          },
        },
        report: {
          select: {
            id: true,
            title: true,
            description: true,
            githubRepoUrl: true,
            status: true,
            submittedAt: true,
            // CRITICAL: NEVER include feedbacks or marks
          },
        },
      },
    });

    if (!studentTask) {
      res.status(404).json({
        success: false,
        error: "Task not found or not assigned to your account.",
      });
      return;
    }

    res.json({
      success: true,
      studentTask: {
        id: studentTask.id,
        taskId: studentTask.task.id,
        title: studentTask.task.title,
        description: studentTask.task.description,
        referenceLink: studentTask.task.referenceLink,
        module: studentTask.task.module,
        assignedAt: studentTask.assignedAt,
        dueAt: studentTask.dueAt,
        status: studentTask.status,
        report: studentTask.report,
      },
    });
  } catch (error) {
    console.error("GET /student/tasks/:id error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 3. Student Submit Report
studentRouter.post("/reports", async (req: AuthenticatedStudentRequest, res: Response) => {
  try {
    const student = req.student!;
    const parsed = reportSubmissionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
      });
      return;
    }

    const { studentTaskId, title, description, githubRepoUrl, aiDeclarationAccepted } = parsed.data;

    const studentTask = await prisma.studentTask.findUnique({
      where: { id: studentTaskId },
      include: { report: true },
    });

    if (!studentTask || studentTask.studentId !== student.id) {
      res.status(404).json({
        success: false,
        error: "Task assignment not found or does not belong to your account.",
      });
      return;
    }

    if (studentTask.report) {
      res.status(400).json({
        success: false,
        error: "A report has already been submitted for this task. Re-submissions are not permitted.",
      });
      return;
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

    // Enqueue async AI review in the background queue (non-blocking)
    queueService.enqueueAiReview(report.id);

    // Return immediately to client
    res.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        submittedAt: report.submittedAt,
        status: report.status,
      },
    });
  } catch (error) {
    console.error("POST /student/reports error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
