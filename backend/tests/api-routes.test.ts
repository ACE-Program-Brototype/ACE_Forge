import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { prisma } from "../src/lib/prisma.js";
import { signAuthToken } from "../src/lib/jwt.js";
import { ADMIN_COOKIE_NAME, STUDENT_COOKIE_NAME } from "../src/middleware/auth.js";

describe("Express API HTTP Routes (api-routes.test.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Health Check (GET /health)", () => {
    it("should return 200 with ok status and connected database when query succeeds", async () => {
      vi.spyOn(prisma, "$queryRaw").mockResolvedValue([{ 1: 1 }] as any);

      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("ace-forge-backend");
      expect(res.body.database).toBe("connected");
      expect(typeof res.body.uptime).toBe("number");
    });

    it("should return 503 degraded when database connectivity fails", async () => {
      vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("Postgres connection refused"));

      const res = await request(app).get("/health");

      expect(res.status).toBe(503);
      expect(res.body.status).toBe("degraded");
      expect(res.body.database).toBe("disconnected");
      expect(res.body.error).toContain("Postgres connection refused");
    });
  });

  describe("Authentication Routes (/api/auth)", () => {
    it("POST /api/auth/admin/login should return 400 if email or password missing", async () => {
      const res = await request(app)
        .post("/api/auth/admin/login")
        .send({ email: "invalid-email" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("POST /api/auth/student/login should return 400 if phone/password missing", async () => {
      const res = await request(app)
        .post("/api/auth/student/login")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("POST /api/auth/admin/logout should clear the admin cookie", async () => {
      const res = await request(app).post("/api/auth/admin/logout");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
      expect(cookieHeader).toContain(ADMIN_COOKIE_NAME);
    });

    it("POST /api/auth/student/logout should clear the student cookie", async () => {
      const res = await request(app).post("/api/auth/student/logout");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
      expect(cookieHeader).toContain(STUDENT_COOKIE_NAME);
    });

    it("GET /api/auth/me should return authenticated: false when unauthenticated", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
      expect(res.body.user).toBeNull();
    });

    it("GET /api/auth/me should return admin user profile with valid admin cookie", async () => {
      const adminToken = await signAuthToken({
        sub: "admin_uid_123",
        email: "super@ace.org",
        name: "ACE Director",
        role: "SUPER_ADMIN",
        userType: "ADMIN",
      });

      vi.spyOn(prisma.admin, "findUnique").mockResolvedValue({
        id: "admin_uid_123",
        name: "ACE Director",
        email: "super@ace.org",
        role: "SUPER_ADMIN",
        isActive: true,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: "hash",
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`${ADMIN_COOKIE_NAME}=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.userType).toBe("ADMIN");
      expect(res.body.user.email).toBe("super@ace.org");
    });

    it("GET /api/auth/me should return student profile with valid student cookie", async () => {
      const studentToken = await signAuthToken({
        sub: "student_uid_456",
        email: "aarav@student.ace.org",
        name: "Aarav Sharma",
        mustChangePassword: false,
        userType: "STUDENT",
      });

      vi.spyOn(prisma.student, "findUnique").mockResolvedValue({
        id: "student_uid_456",
        name: "Aarav Sharma",
        email: "aarav@student.ace.org",
        status: "ACTIVE",
        batchId: "batch_1",
        currentModuleId: "mod_1",
        phone: "+919876543210",
        passwordHash: "hash",
        mustChangePassword: false,
        createdById: "admin_1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`${STUDENT_COOKIE_NAME}=${studentToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.userType).toBe("STUDENT");
      expect(res.body.user.email).toBe("aarav@student.ace.org");
    });
  });

  describe("Protected Student Routes Security", () => {
    it("GET /api/student/dashboard should return 401 when no token is present", async () => {
      const res = await request(app).get("/api/student/dashboard");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Unauthorized");
    });

    it("GET /api/student/tasks/:id should return 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/student/tasks/task_123");
      expect(res.status).toBe(401);
    });

    it("POST /api/student/reports should return 401 when unauthenticated", async () => {
      const res = await request(app).post("/api/student/reports").send({
        studentTaskId: "st_123",
        title: "Milestone",
        description: "Report writeup description",
        githubRepoUrl: "https://github.com/student/repo",
        aiDeclarationAccepted: true,
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Protected Admin Routes & Role Enforcement", () => {
    it("GET /api/admin/dashboard/stats should return 401 without admin credentials", async () => {
      const res = await request(app).get("/api/admin/dashboard/stats");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/admin/active-students should return 401 without admin credentials", async () => {
      const res = await request(app).get("/api/admin/active-students");
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/batches should return 401 without admin credentials", async () => {
      const res = await request(app).get("/api/admin/batches");
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/modules should return 401 without admin credentials", async () => {
      const res = await request(app).get("/api/admin/modules");
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/reports should return 401 without admin credentials", async () => {
      const res = await request(app).get("/api/admin/reports");
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/team should return 401 without admin credentials", async () => {
      const res = await request(app).get("/api/admin/team");
      expect(res.status).toBe(401);
    });

    it("Student credentials should be strictly rejected when accessing admin endpoints", async () => {
      const studentToken = await signAuthToken({
        sub: "student_hacker",
        email: "hacker@student.ace.org",
        name: "Intruder",
        mustChangePassword: false,
        userType: "STUDENT",
      });

      const res = await request(app)
        .get("/api/admin/dashboard/stats")
        .set("Cookie", [`${ADMIN_COOKIE_NAME}=${studentToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
