import { Router, Request, Response } from "express";
import { runRemindersAndOverdueJob } from "../services/reminder.service.js";
import { env } from "../config/env.js";

export const cronRouter = Router();

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === env.CRON_SECRET) return true;
  }

  const customHeader = req.headers["x-cron-secret"];
  if (customHeader && customHeader === env.CRON_SECRET) {
    return true;
  }

  // Allow in development mode if no CRON_SECRET is enforced
  if (env.NODE_ENV === "development" && (!env.CRON_SECRET || env.CRON_SECRET === "ace-forge-cron-secret-2026")) {
    return true;
  }

  return false;
}

cronRouter.all("/reminders", async (req: Request, res: Response) => {
  if (!verifyCronSecret(req)) {
    res.status(401).json({ success: false, error: "Unauthorized: Invalid cron secret" });
    return;
  }

  try {
    const result = await runRemindersAndOverdueJob();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron execution error:", error);
    res.status(500).json({ success: false, error: "Cron execution error" });
  }
});
