import { PrismaClient, Role, BatchStatus, StudentStatus, StudentTaskStatus, ReportStatus, FeedbackType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting ace_forge database seed...");

  // 1. Super Admin from env
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "director@aceprogram.org").toLowerCase().trim();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperSecretAdminPassword123!";
  const superAdminName = process.env.SUPER_ADMIN_NAME || "ACE Director";

  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  const superAdmin = await prisma.admin.upsert({
    where: { email: superAdminEmail },
    update: {
      name: superAdminName,
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      name: superAdminName,
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Super Admin configured: ${superAdmin.email}`);

  // 2. Staff Admin (Employee)
  const staffEmail = "venkitesh@aceprogram.org";
  const staffHash = await bcrypt.hash("AdminEmployeePassword123!", 10);
  const staffAdmin = await prisma.admin.upsert({
    where: { email: staffEmail },
    update: {
      name: "Venkitesh N S",
      passwordHash: staffHash,
      role: Role.ADMIN,
      isActive: true,
      createdById: superAdmin.id,
    },
    create: {
      name: "Venkitesh N S",
      email: staffEmail,
      passwordHash: staffHash,
      role: Role.ADMIN,
      isActive: true,
      createdById: superAdmin.id,
    },
  });
  console.log(`✅ Staff Admin configured: ${staffAdmin.email}`);

  // 3. Batch
  const batchName = "Cohort 2026 - Systems & Architecture";
  const batch = await prisma.batch.upsert({
    where: { name: batchName },
    update: {},
    create: {
      name: batchName,
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      status: BatchStatus.ACTIVE,
    },
  });
  console.log(`✅ Batch configured: ${batch.name}`);

  // 4. Modules
  const modulesData = [
    {
      name: "Week 1: High-Throughput HTTP & Concurrency",
      orderIndex: 1,
      description: "Design and implement a non-blocking asynchronous HTTP reverse proxy with token bucket rate limiting, bounded worker pools, and structured telemetry.",
    },
    {
      name: "Week 2: Database Internals & MVCC Optimization",
      orderIndex: 2,
      description: "Deep-dive into PostgreSQL indexing strategies, isolation levels, MVCC vacuuming, query plan optimization, and zero-downtime table migrations.",
    },
    {
      name: "Week 3: Event-Driven Systems & Transactional Outbox",
      orderIndex: 3,
      description: "Build an event-driven architecture using PostgreSQL change data capture (CDC), transactional outbox pattern, and resilient dead-letter retries.",
    },
  ];

  const modules = [];
  for (const m of modulesData) {
    const existing = await prisma.module.findFirst({
      where: { orderIndex: m.orderIndex },
    });
    if (existing) {
      const updated = await prisma.module.update({
        where: { id: existing.id },
        data: m,
      });
      modules.push(updated);
    } else {
      const created = await prisma.module.create({
        data: m,
      });
      modules.push(created);
    }
  }
  console.log(`✅ Modules configured: ${modules.length} modules`);

  // 5. Tasks for Module 1 & 2
  const tasksData = [
    {
      title: "Token-Bucket Rate Limiter & Reverse Proxy",
      description: "Implement an HTTP reverse proxy in Go/Node.js with token bucket rate limiting per IP address, unit tests for edge cases, and graceful worker shutdown.",
      referenceLink: "https://en.wikipedia.org/wiki/Token_bucket",
      moduleId: modules[0].id,
      createdById: staffAdmin.id,
    },
    {
      title: "Write-Ahead Log (WAL) Key-Value Store",
      description: "Build an append-only append log key-value storage engine with in-memory memtable, segment compaction, and crash recovery tests.",
      referenceLink: "https://raft.github.io",
      moduleId: modules[0].id,
      createdById: staffAdmin.id,
    },
    {
      title: "High-Volume Financial Ledger with Idempotency",
      description: "Design a double-entry accounting ledger in PostgreSQL with strict ACID guarantees, idempotency keys for duplicate prevention, and balance constraint checks.",
      referenceLink: "https://martinfowler.com/articles/patterns-of-distributed-systems/idempotent-receiver.html",
      moduleId: modules[1].id,
      createdById: staffAdmin.id,
    },
  ];

  const tasks = [];
  for (const t of tasksData) {
    const existing = await prisma.task.findFirst({
      where: { title: t.title, moduleId: t.moduleId },
    });
    if (existing) {
      tasks.push(existing);
    } else {
      const created = await prisma.task.create({
        data: t,
      });
      tasks.push(created);
    }
  }
  console.log(`✅ Tasks configured: ${tasks.length} tasks`);

  // 6. Students
  const studentsData = [
    {
      name: "Aarav Shah",
      email: "aarav@student.aceprogram.org",
      phone: "+919876543210",
      batchId: batch.id,
      currentModuleId: modules[0].id,
    },
    {
      name: "Diya Patel",
      email: "diya@student.aceprogram.org",
      phone: "+919876543211",
      batchId: batch.id,
      currentModuleId: modules[0].id,
    },
    {
      name: "Rohan Mehta",
      email: "rohan@student.aceprogram.org",
      phone: "+919876543212",
      batchId: batch.id,
      currentModuleId: modules[1].id,
    },
  ];

  const students = [];
  for (const s of studentsData) {
    // Initial student password is their phone number
    const passwordHash = await bcrypt.hash(s.phone, 10);
    const student = await prisma.student.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        phone: s.phone,
        batchId: s.batchId,
        currentModuleId: s.currentModuleId,
      },
      create: {
        name: s.name,
        email: s.email,
        phone: s.phone,
        passwordHash,
        batchId: s.batchId,
        currentModuleId: s.currentModuleId,
        status: StudentStatus.ACTIVE,
        mustChangePassword: true,
        createdById: staffAdmin.id,
      },
    });
    students.push(student);
  }
  console.log(`✅ Students configured: ${students.length} students`);

  // 7. Student Task Assignments
  const now = new Date();
  const dayInMs = 24 * 60 * 60 * 1000;
  for (const student of students) {
    const moduleTasks = await prisma.task.findMany({
      where: { moduleId: student.currentModuleId, isActive: true },
    });

    for (const task of moduleTasks) {
      const assignedAt = new Date(now.getTime() - 2 * dayInMs); // assigned 2 days ago
      const dueAt = new Date(assignedAt.getTime() + 7 * dayInMs); // 7 days from assignment

      await prisma.studentTask.upsert({
        where: {
          studentId_taskId: {
            studentId: student.id,
            taskId: task.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          taskId: task.id,
          assignedAt,
          dueAt,
          status: StudentTaskStatus.ASSIGNED,
        },
      });
    }
  }
  console.log("✅ StudentTask assignments generated.");

  // 8. Demo Submitted Report & AI Feedback for Diya Patel on Task 1
  const diya = students.find((s) => s.email === "diya@student.aceprogram.org");
  const task1 = tasks.find((t) => t.title.includes("Token-Bucket"));
  if (diya && task1) {
    const studentTask = await prisma.studentTask.findUnique({
      where: {
        studentId_taskId: {
          studentId: diya.id,
          taskId: task1.id,
        },
      },
    });

    if (studentTask) {
      const existingReport = await prisma.report.findUnique({
        where: { studentTaskId: studentTask.id },
      });

      if (!existingReport) {
        const report = await prisma.report.create({
          data: {
            studentTaskId: studentTask.id,
            studentId: diya.id,
            taskId: task1.id,
            githubRepoUrl: "https://github.com/diya-patel/rate-limited-proxy",
            title: "Implementation of Token-Bucket Reverse Proxy in Go",
            description: "Developed a concurrent reverse proxy utilizing atomic token bucket rate limiting per client IP. Implemented automated benchmark tests showing sub-millisecond response latency under 10k concurrent requests.",
            aiDeclarationAccepted: true,
            status: ReportStatus.AI_REVIEWED,
          },
        });

        await prisma.studentTask.update({
          where: { id: studentTask.id },
          data: { status: StudentTaskStatus.SUBMITTED },
        });

        await prisma.feedback.create({
          data: {
            reportId: report.id,
            taskId: task1.id,
            studentId: diya.id,
            type: FeedbackType.AI,
            marks: 88,
            comments: "Solid implementation of the token bucket algorithm. Clean separation of concerns between HTTP reverse proxy handling and rate limiting middleware. High commit authenticity with incremental commit history.",
            strengths: [
              "Proper thread-safe sync.Mutex implementation in token refill logic",
              "Comprehensive unit test suite with 92% code coverage",
              "Clear, self-documenting code with meaningful commit messages",
            ],
            improvements: [
              "Consider Redis-backed token bucket for multi-node distributed environments",
              "Expose Prometheus metrics for rate limit drop rates",
            ],
            aiModel: "claude-3-5-sonnet-20241022",
            repoSnapshot: {
              stars: 2,
              forks: 0,
              languages: { Go: 94.2, Makefile: 5.8 },
              totalCommits: 14,
              keyFiles: ["main.go", "limiter/token_bucket.go", "limiter/token_bucket_test.go"],
              aiGeneratedLikelihood: "low",
            },
          },
        });
        console.log("✅ Demo report & AI feedback created for Diya Patel.");
      }
    }
  }

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
