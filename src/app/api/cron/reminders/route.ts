import { NextResponse } from "next/server";
import { runRemindersAndOverdueJob } from "@/services/reminder.service";

export async function GET() {
  try {
    const result = await runRemindersAndOverdueJob();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("GET /api/cron/reminders error:", error);
    return NextResponse.json(
      { success: false, error: "Cron execution error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
