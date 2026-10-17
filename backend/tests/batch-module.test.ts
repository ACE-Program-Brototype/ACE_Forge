import { describe, it, expect } from "vitest";
import { createBatchSchema, updateBatchSchema } from "../src/validators/batch.js";
import { createModuleSchema, updateModuleSchema } from "../src/validators/module.js";
import { createTaskSchema, updateTaskSchema } from "../src/validators/task.js";

describe("Batch, Module & Task Schemas (batch-module.test.ts)", () => {
  describe("Batch Schema", () => {
    it("should accept valid batch with defaults", () => {
      const parsed = createBatchSchema.parse({
        name: "Cohort Alpha",
        startDate: "2026-10-01",
      });
      expect(parsed.name).toBe("Cohort Alpha");
      expect(parsed.status).toBe("ACTIVE");
    });

    it("should reject batch with name shorter than 2 chars", () => {
      const result = createBatchSchema.safeParse({
        name: "A",
        startDate: "2026-10-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 2 characters");
      }
    });

    it("should reject invalid status", () => {
      const result = createBatchSchema.safeParse({
        name: "Cohort Beta",
        startDate: "2026-10-01",
        status: "PENDING",
      });
      expect(result.success).toBe(false);
    });

    it("should validate partial updates in updateBatchSchema", () => {
      const parsed = updateBatchSchema.parse({
        status: "COMPLETED",
      });
      expect(parsed.status).toBe("COMPLETED");
      expect(parsed.name).toBeUndefined();
    });
  });

  describe("Module Schema", () => {
    it("should accept valid module specification", () => {
      const parsed = createModuleSchema.parse({
        name: "Week 1: Fundamentals",
        orderIndex: 1,
        description: "Foundational concurrent programming in Go and Rust.",
      });
      expect(parsed.orderIndex).toBe(1);
      expect(parsed.name).toBe("Week 1: Fundamentals");
    });

    it("should coerce string orderIndex to integer", () => {
      const parsed = createModuleSchema.parse({
        name: "Week 2: Networking",
        orderIndex: "2",
        description: "Socket programming and reverse proxies.",
      });
      expect(parsed.orderIndex).toBe(2);
      expect(typeof parsed.orderIndex).toBe("number");
    });

    it("should reject orderIndex less than 1", () => {
      const result = createModuleSchema.safeParse({
        name: "Week 0",
        orderIndex: 0,
        description: "Pre-course setup and tooling.",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1");
      }
    });

    it("should reject description shorter than 5 chars", () => {
      const result = createModuleSchema.safeParse({
        name: "Week 3",
        orderIndex: 3,
        description: "Bad",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Task Schema", () => {
    it("should accept valid task with reference URL", () => {
      const parsed = createTaskSchema.parse({
        title: "Build High-Performance HTTP Proxy",
        description: "Implement a thread-safe token bucket rate limiter in Go with benchmarks.",
        referenceLink: "https://en.wikipedia.org/wiki/Token_bucket",
        moduleId: "mod_week1_id",
      });
      expect(parsed.isActive).toBe(true);
      expect(parsed.referenceLink).toBe("https://en.wikipedia.org/wiki/Token_bucket");
    });

    it("should allow empty string or null for referenceLink", () => {
      const emptyLink = createTaskSchema.parse({
        title: "System Design Analysis",
        description: "Write architectural document on Raft consensus protocols.",
        referenceLink: "",
        moduleId: "mod_week2_id",
      });
      expect(emptyLink.referenceLink).toBe("");

      const nullLink = createTaskSchema.parse({
        title: "System Design Analysis",
        description: "Write architectural document on Raft consensus protocols.",
        referenceLink: null,
        moduleId: "mod_week2_id",
      });
      expect(nullLink.referenceLink).toBeNull();
    });

    it("should reject invalid URL format for referenceLink", () => {
      const result = createTaskSchema.safeParse({
        title: "Distributed KV Store",
        description: "Build concurrent LSM tree storage engine.",
        referenceLink: "not-a-valid-url",
        moduleId: "mod_week3_id",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid URL");
      }
    });

    it("should reject task description shorter than 10 characters", () => {
      const result = createTaskSchema.safeParse({
        title: "Microservice",
        description: "Too short",
        moduleId: "mod_week4_id",
      });
      expect(result.success).toBe(false);
    });
  });
});
