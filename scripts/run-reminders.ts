import { runRemindersAndOverdueJob } from "../src/services/reminder.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🚀 Starting ACE Forge Scheduled Reminders & Overdue Cron Runner...");
  const result = await runRemindersAndOverdueJob();
  console.log("📊 Execution Results:", result);
}

main()
  .catch((err) => {
    console.error("❌ Cron job execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
