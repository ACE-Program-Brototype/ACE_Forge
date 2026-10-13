import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { EmailType, StudentTaskStatus } from "@prisma/client";

export const REMINDER_DAY_OFFSET = 6;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const REMINDER_THRESHOLD_MS = REMINDER_DAY_OFFSET * MS_PER_DAY;

/**
 * Pure calculation to determine if day-6 reminder should be sent.
 */
export function shouldSendDay6Reminder(
  assignedAt: Date,
  now: Date = new Date(),
  reminderSentAt?: Date | null,
  dueAt?: Date
): boolean {
  if (reminderSentAt) return false; // Idempotent check
  const elapsedMs = now.getTime() - assignedAt.getTime();
  if (elapsedMs < REMINDER_THRESHOLD_MS) return false; // Has not reached 6 days yet
  if (dueAt && now.getTime() >= dueAt.getTime()) return false; // Already past due date
  return true;
}

/**
 * Pure calculation to determine if a task is overdue.
 */
export function isTaskOverdue(
  dueAt: Date,
  now: Date = new Date(),
  hasReport: boolean = false
): boolean {
  if (hasReport) return false;
  return now.getTime() >= dueAt.getTime();
}

/**
 * Idempotent reminder and overdue background job runner.
 */
export async function runRemindersAndOverdueJob(referenceTime: Date = new Date()) {
  console.log(`⏰ Running reminder and overdue job at ${referenceTime.toISOString()}...`);

  const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Fetch all ASSIGNED student tasks without reports
  const pendingTasks = await prisma.studentTask.findMany({
    where: {
      status: StudentTaskStatus.ASSIGNED,
      report: null,
      student: { status: "ACTIVE" },
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
    },
  });

  let remindersSent = 0;
  let overdueMarked = 0;

  for (const st of pendingTasks) {
    // 1. Check Day 6 Reminder
    if (shouldSendDay6Reminder(st.assignedAt, referenceTime, st.reminderSentAt, st.dueAt)) {
      const emailBody = `Hello ${st.student.name},

This is an urgent reminder that your weekly engineering milestone "${st.task.title}" is due in approximately 24 hours.

Due Date: ${new Date(st.dueAt).toLocaleString()}
Submit Report: ${appUrl}/tasks/${st.task.id}

Please ensure your GitHub repository is updated and submit your report before the deadline to avoid academic penalty.

Best regards,
ACE Engineering Faculty`;

      const result = await sendEmail({
        to: st.student.email,
        studentId: st.student.id,
        studentTaskId: st.id,
        type: EmailType.REMINDER_DAY6,
        subject: `[ACE Reminder] 24 Hours Remaining for "${st.task.title}"`,
        text: emailBody,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #002C5F;">
          <h2 style="color: #002C5F;">24 Hours Remaining: Weekly Task Due Soon</h2>
          <p>Hello <strong>${st.student.name}</strong>,</p>
          <p>Your weekly task <strong>${st.task.title}</strong> is due on <strong>${new Date(st.dueAt).toLocaleString()}</strong>.</p>
          <p>
            <a href="${appUrl}/tasks/${st.task.id}" style="display: inline-block; padding: 10px 20px; background-color: #002C5F; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Submit Weekly Report Now →
            </a>
          </p>
          <p style="color: #64748B; font-size: 12px; margin-top: 20px;">
            Remember that reports require a public GitHub repository and acceptance of the strict AI-disqualification policy.
          </p>
        </div>`,
      });

      if (result.success) {
        await prisma.studentTask.update({
          where: { id: st.id },
          data: { reminderSentAt: referenceTime },
        });
        remindersSent++;
      }
    }

    // 2. Check Overdue Status
    if (isTaskOverdue(st.dueAt, referenceTime, false)) {
      await prisma.studentTask.update({
        where: { id: st.id },
        data: { status: StudentTaskStatus.OVERDUE },
      });
      overdueMarked++;
    }
  }

  console.log(`✅ Reminder & overdue job finished: ${remindersSent} reminders sent, ${overdueMarked} marked overdue.`);
  return { remindersSent, overdueMarked, totalProcessed: pendingTasks.length };
}
