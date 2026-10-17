import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import * as reminderService from "../src/services/reminder.service.js";
import { env } from "../src/config/env.js";

describe("Cron Reminders Route (POST /api/cron/reminders)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when request has no Authorization or X-Cron-Secret header", async () => {
    const res = await request(app).post("/api/cron/reminders");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Unauthorized: Invalid cron secret");
  });

  it("should return 401 when Bearer token is invalid", async () => {
    const res = await request(app)
      .post("/api/cron/reminders")
      .set("Authorization", "Bearer wrong-secret-token");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 200 when valid Bearer token matching CRON_SECRET is provided", async () => {
    const mockResult = {
      remindersSent: 3,
      markedOverdue: 1,
      totalChecked: 15,
      errors: [],
    };
    vi.spyOn(reminderService, "runRemindersAndOverdueJob").mockResolvedValue(mockResult);

    const res = await request(app)
      .post("/api/cron/reminders")
      .set("Authorization", `Bearer ${env.CRON_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.remindersSent).toBe(3);
    expect(res.body.markedOverdue).toBe(1);
    expect(res.body.totalChecked).toBe(15);
  });

  it("should return 200 when valid X-Cron-Secret header is provided", async () => {
    const mockResult = {
      remindersSent: 0,
      markedOverdue: 0,
      totalChecked: 5,
      errors: [],
    };
    vi.spyOn(reminderService, "runRemindersAndOverdueJob").mockResolvedValue(mockResult);

    const res = await request(app)
      .post("/api/cron/reminders")
      .set("x-cron-secret", env.CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 500 when reminder service execution throws an error", async () => {
    vi.spyOn(reminderService, "runRemindersAndOverdueJob").mockRejectedValue(
      new Error("Database connection timeout during reminder sweep")
    );

    const res = await request(app)
      .post("/api/cron/reminders")
      .set("Authorization", `Bearer ${env.CRON_SECRET}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Cron execution error");
  });
});
