import { prisma } from "../src/lib/prisma";
import { FeedbackType, ReportStatus, StudentStatus, StudentTaskStatus, EmailType, EmailStatus } from "@prisma/client";

async function main() {
  console.log("=== Testing Permanent Student Deletion with Cascading Cleanup ===");

  // 1. Get or create sample batch & module
  const batch = await prisma.batch.findFirst();
  const moduleItem = await prisma.module.findFirst();
  const task = await prisma.task.findFirst();

  if (!batch || !moduleItem || !task) {
    console.error("Missing seed data (batch, module, or task).");
    return;
  }

  // 2. Create a test student
  const testEmail = `delete-test-${Date.now()}@test.com`;
  const student = await prisma.student.create({
    data: {
      name: "Temporary Test Student",
      email: testEmail,
      phone: "+15559998888",
      passwordHash: "dummy-hash",
      batchId: batch.id,
      currentModuleId: moduleItem.id,
      status: StudentStatus.ACTIVE,
    },
  });
  console.log("✅ Created student:", student.id, student.name);

  // 3. Create a StudentTask
  const studentTask = await prisma.studentTask.create({
    data: {
      studentId: student.id,
      taskId: task.id,
      assignedAt: new Date(),
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: StudentTaskStatus.SUBMITTED,
    },
  });
  console.log("✅ Created studentTask:", studentTask.id);

  // 4. Create a Report
  const report = await prisma.report.create({
    data: {
      studentTaskId: studentTask.id,
      studentId: student.id,
      taskId: task.id,
      githubRepoUrl: "https://github.com/test/repo",
      title: "Test Submission Title",
      description: "Test submission description",
      aiDeclarationAccepted: true,
      status: ReportStatus.AI_REVIEWED,
    },
  });
  console.log("✅ Created report:", report.id);

  // 5. Create AI Feedback
  const feedback = await prisma.feedback.create({
    data: {
      reportId: report.id,
      taskId: task.id,
      studentId: student.id,
      type: FeedbackType.AI,
      marks: 85,
      comments: "Good implementation",
      strengths: ["Clean code"],
      improvements: ["Add tests"],
    },
  });
  console.log("✅ Created feedback:", feedback.id);

  // 6. Create EmailLog
  const emailLog = await prisma.emailLog.create({
    data: {
      studentId: student.id,
      studentTaskId: studentTask.id,
      type: EmailType.WELCOME,
      status: EmailStatus.SENT,
    },
  });
  console.log("✅ Created emailLog:", emailLog.id);

  // 7. Verify all records exist
  console.log("\nVerifying records before deletion:");
  const beforeStudent = await prisma.student.findUnique({ where: { id: student.id } });
  const beforeTasks = await prisma.studentTask.count({ where: { studentId: student.id } });
  const beforeReports = await prisma.report.count({ where: { studentId: student.id } });
  const beforeFeedbacks = await prisma.feedback.count({ where: { studentId: student.id } });
  const beforeEmailLogs = await prisma.emailLog.count({ where: { studentId: student.id } });

  console.log({
    studentExists: !!beforeStudent,
    taskCount: beforeTasks,
    reportCount: beforeReports,
    feedbackCount: beforeFeedbacks,
    emailLogCount: beforeEmailLogs,
  });

  // 8. Execute the cascading deletion transaction as implemented in DELETE route
  console.log("\nExecuting permanent deletion transaction...");
  await prisma.$transaction(async (tx) => {
    const studentTasks = await tx.studentTask.findMany({
      where: { studentId: student.id },
      select: { id: true },
    });
    const taskIds = studentTasks.map((st) => st.id);

    await tx.emailLog.deleteMany({
      where: {
        OR: [{ studentId: student.id }, { studentTaskId: { in: taskIds } }],
      },
    });

    await tx.feedback.deleteMany({ where: { studentId: student.id } });
    await tx.report.deleteMany({ where: { studentId: student.id } });
    await tx.studentTask.deleteMany({ where: { studentId: student.id } });
    await tx.student.delete({ where: { id: student.id } });
  });

  // 9. Verify all records have been erased
  console.log("\nVerifying records after permanent deletion:");
  const afterStudent = await prisma.student.findUnique({ where: { id: student.id } });
  const afterTasks = await prisma.studentTask.count({ where: { studentId: student.id } });
  const afterReports = await prisma.report.count({ where: { studentId: student.id } });
  const afterFeedbacks = await prisma.feedback.count({ where: { studentId: student.id } });
  const afterEmailLogs = await prisma.emailLog.count({ where: { studentId: student.id } });

  console.log({
    studentExists: !!afterStudent,
    taskCount: afterTasks,
    reportCount: afterReports,
    feedbackCount: afterFeedbacks,
    emailLogCount: afterEmailLogs,
  });

  if (
    !afterStudent &&
    afterTasks === 0 &&
    afterReports === 0 &&
    afterFeedbacks === 0 &&
    afterEmailLogs === 0
  ) {
    console.log("\n🎉 ALL CORRELATED DATA PERMANENTLY AND CLEANLY DELETED!");
  } else {
    console.error("\n❌ Orphaned data detected!");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
