import { prisma } from "@/lib/prisma";
import { StudentTaskStatus, StudentStatus } from "@prisma/client";

export const TASK_DURATION_DAYS = 7;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateDueDate(assignedAt: Date = new Date()): Date {
  return new Date(assignedAt.getTime() + TASK_DURATION_DAYS * MS_PER_DAY);
}

/**
 * When a task is added to a module, automatically assign it to all active students
 * currently enrolled in that module.
 */
export async function assignNewTaskToActiveStudents(taskId: string, moduleId: string) {
  const activeStudents = await prisma.student.findMany({
    where: {
      currentModuleId: moduleId,
      status: StudentStatus.ACTIVE,
    },
    select: { id: true },
  });

  const now = new Date();
  const dueAt = calculateDueDate(now);

  const assignments = [];
  for (const student of activeStudents) {
    const studentTask = await prisma.studentTask.upsert({
      where: {
        studentId_taskId: {
          studentId: student.id,
          taskId,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        taskId,
        assignedAt: now,
        dueAt,
        status: StudentTaskStatus.ASSIGNED,
      },
    });
    assignments.push(studentTask);
  }

  return assignments;
}

/**
 * When a student changes module, assign all active tasks of the new module to the student.
 */
export async function assignModuleTasksToStudent(studentId: string, moduleId: string) {
  const activeTasks = await prisma.task.findMany({
    where: {
      moduleId,
      isActive: true,
    },
    select: { id: true },
  });

  const now = new Date();
  const dueAt = calculateDueDate(now);

  const assignments = [];
  for (const task of activeTasks) {
    const studentTask = await prisma.studentTask.upsert({
      where: {
        studentId_taskId: {
          studentId,
          taskId: task.id,
        },
      },
      update: {},
      create: {
        studentId,
        taskId: task.id,
        assignedAt: now,
        dueAt,
        status: StudentTaskStatus.ASSIGNED,
      },
    });
    assignments.push(studentTask);
  }

  return assignments;
}
