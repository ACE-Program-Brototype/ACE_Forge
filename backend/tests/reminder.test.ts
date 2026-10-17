import { describe, it, expect } from "vitest";
import { shouldSendDay6Reminder, isTaskOverdue, MS_PER_DAY } from "../src/services/reminder.service";

describe("Reminder Email Timing & Overdue Logic", () => {
  describe("Day 6 of 7 Reminder Rules", () => {
    it("should return false when less than 6 days have elapsed since assignment", () => {
      const assignedAt = new Date("2026-10-10T00:00:00.000Z");
      // 5 days later
      const now = new Date(assignedAt.getTime() + 5 * MS_PER_DAY);
      const dueAt = new Date(assignedAt.getTime() + 7 * MS_PER_DAY);

      const result = shouldSendDay6Reminder(assignedAt, now, null, dueAt);
      expect(result).toBe(false);
    });

    it("should return true when 6 days have elapsed and no reminder has been sent", () => {
      const assignedAt = new Date("2026-10-10T00:00:00.000Z");
      // 6 days and 1 hour later
      const now = new Date(assignedAt.getTime() + 6 * MS_PER_DAY + 60 * 60 * 1000);
      const dueAt = new Date(assignedAt.getTime() + 7 * MS_PER_DAY);

      const result = shouldSendDay6Reminder(assignedAt, now, null, dueAt);
      expect(result).toBe(true);
    });

    it("should be idempotent and return false if reminder has already been sent", () => {
      const assignedAt = new Date("2026-10-10T00:00:00.000Z");
      const now = new Date(assignedAt.getTime() + 6 * MS_PER_DAY + 60 * 60 * 1000);
      const dueAt = new Date(assignedAt.getTime() + 7 * MS_PER_DAY);
      const alreadySentAt = new Date(assignedAt.getTime() + 6 * MS_PER_DAY);

      const result = shouldSendDay6Reminder(assignedAt, now, alreadySentAt, dueAt);
      expect(result).toBe(false);
    });

    it("should return false if current time has already passed due date", () => {
      const assignedAt = new Date("2026-10-10T00:00:00.000Z");
      // 8 days later (past 7-day due date)
      const now = new Date(assignedAt.getTime() + 8 * MS_PER_DAY);
      const dueAt = new Date(assignedAt.getTime() + 7 * MS_PER_DAY);

      const result = shouldSendDay6Reminder(assignedAt, now, null, dueAt);
      expect(result).toBe(false);
    });
  });

  describe("Overdue Status Rules", () => {
    it("should return false before due date", () => {
      const dueAt = new Date("2026-10-17T00:00:00.000Z");
      const now = new Date("2026-10-16T23:59:59.000Z");

      expect(isTaskOverdue(dueAt, now, false)).toBe(false);
    });

    it("should return true once due date has passed without submission", () => {
      const dueAt = new Date("2026-10-17T00:00:00.000Z");
      const now = new Date("2026-10-17T00:00:01.000Z");

      expect(isTaskOverdue(dueAt, now, false)).toBe(true);
    });

    it("should return false even if past due date if report was already submitted", () => {
      const dueAt = new Date("2026-10-17T00:00:00.000Z");
      const now = new Date("2026-10-18T00:00:00.000Z");

      expect(isTaskOverdue(dueAt, now, true)).toBe(false);
    });
  });
});
