import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { env } from "./config/env.js";
import { prisma, verifyDatabaseConnection } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { studentRouter } from "./routes/student.routes.js";
import { cronRouter } from "./routes/cron.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { runRemindersAndOverdueJob } from "./services/reminder.service.js";

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*") || env.NODE_ENV === "development") {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Cron-Secret", "X-Requested-With", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  })
);

// HTTP Request Logging Middleware (tracks request ID, latency, and response code)
app.use(requestLogger);

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Healthcheck
app.get("/health", async (_req, res) => {
  try {
    // Verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "ace-forge-backend",
      database: "connected",
      version: "1.0.0",
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "ace-forge-backend",
      database: "disconnected",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Mount Routes
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/student", studentRouter);
app.use("/api/cron", cronRouter);

// Global Error Handler
app.use(errorHandler);

// In-process Scheduled Job helper
function setupCronScheduler() {
  cron.schedule("0 * * * *", () => {
    logger.info("Triggering scheduled hourly reminder check...", { context: "CRON" });
    runRemindersAndOverdueJob().catch((err) => {
      logger.error("Hourly reminder job failed", { error: err instanceof Error ? err.message : String(err), context: "CRON" });
    });
  });
  logger.info("Initialized hourly reminder scheduler (0 * * * *).", { context: "CRON" });
}

let server: ReturnType<typeof app.listen> | undefined;

async function startServer() {
  if (env.NODE_ENV === "test") {
    return;
  }

  logger.info("Verifying PostgreSQL connection before starting server...", { context: "DATABASE" });

  try {
    await verifyDatabaseConnection();
    logger.info("PostgreSQL connected successfully!", { context: "DATABASE" });
  } catch (dbError) {
    const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
    logger.error("Failed to connect to PostgreSQL. Server will not start.", {
      error: errorMsg,
      context: "DATABASE_FATAL",
    });
    process.exit(1);
  }

  // Only listen after confirming database connection
  server = app.listen(env.PORT, () => {
    logger.info(`ACE Forge Backend API running on port ${env.PORT}`, {
      port: env.PORT,
      env: env.NODE_ENV,
      corsOrigins: allowedOrigins,
      healthCheck: `http://localhost:${env.PORT}/health`,
      context: "SERVER",
    });
  });

  // Graceful Shutdown
  const handleShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`, { context: "SERVER" });
    if (server) {
      server.close(async () => {
        try {
          await prisma.$disconnect();
          logger.info("Prisma disconnected. Process exiting cleanly.", { context: "SERVER" });
          process.exit(0);
        } catch (err) {
          logger.error("Error disconnecting Prisma", { error: err instanceof Error ? err.message : String(err), context: "SERVER" });
          process.exit(1);
        }
      });
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));

  // Start cron jobs
  setupCronScheduler();
}

startServer();

export { app };
export default app;
