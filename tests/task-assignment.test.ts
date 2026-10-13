import { describe, it, expect } from "vitest";
import { calculateDueDate, TASK_DURATION_DAYS, MS_PER_DAY } from "../src/services/task-assignment.service";
import { createBatchSchema } from "../src/validators/batch";
import { createModuleSchema } from "../src/validators/module";
import { createTaskSchema } from "../src/validators/task";

describe("Task Assignment & Curriculum Logic", () => {
  describe("Due Date Calculation", () => {
    it("should accurately compute due date as exactly 7 days after assignment", () => {
      const assignedAt = new Date("2026-10-15T10:00:00.000Z");
      const dueAt = calculateDueDate(assignedAt);

      const diffMs = dueAt.getTime() - assignedAt.getTime();
      const diffDays = diffMs / MS_PER_DAY;

      expect(diffDays).toBe(TASK_DURATION_DAYS);
      expect(dueAt.toISOString()).toBe("2026-10-22T10:00:00.000Z");
    });

    it("should handle month boundaries correctly", () => {
      const assignedAt = new Date("2026-01-28T12:00:00.000Z");
      const dueAt = calculateDueDate(assignedAt);

      expect(dueAt.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(dueAt.getUTCDate()).toBe(4);
    });
  });

  describe("Validation Schemas", () => {
    it("should validate batch creation", () => {
      const valid = createBatchSchema.safeParse({
        name: "Cohort 2026 - Systems",
        startDate: "2026-08-01",
        status: "ACTIVE",
      });
      expect(valid.success).toBe(true);
    });

    it("should validate module creation", () => {
      const valid = createModuleSchema.safeParse({
        name: "Week 1: High Concurrency",
        orderIndex: 1,
        description: "Study of non-blocking I/O and goroutines",
      });
      expect(valid.success).toBe(true);
    });

    it("should validate task creation with optional reference link", () => {
      const valid = createTaskSchema.safeParse({
        title: "Token Bucket Rate Limiter",
        description: "Design and implement a rate limiter algorithm",
        referenceLink: "https://en.wikipedia.org/wiki/Token_bucket",
        moduleId: "mod-123",
        isActive: true,
      });
      expect(valid.success).toBe(true);
    });

    it("should accept empty or null referenceLink in task", () => {
      const validEmpty = createTaskSchema.safeParse({
        title: "Token Bucket Rate Limiter",
        description: "Design and implement a rate limiter algorithm",
        referenceLink: "",
        moduleId: "mod-123",
        isActive: true,
      });
      expect(validEmpty.success).toBe(true);
    });

    it("should reject invalid referenceLink URL", () => {
      const invalid = createTaskSchema.safeParse({
        title: "Token Bucket Rate Limiter",
        description: "Design and implement a rate limiter algorithm",
        referenceLink: "not-a-valid-url",
        moduleId: "mod-123",
        isActive: true,
      });
      expect(invalid.success).toBe(false);
    });
  });
});
