import { prisma } from "../src/lib/prisma";
import { triggerAsyncAiReview } from "../src/services/ai-review.service";
import { fetchGitHubRepoSnapshot } from "../src/services/github.service";
import { ReportStatus, StudentTaskStatus, FeedbackType } from "@prisma/client";

async function diagnoseReports() {
  console.log("==================================================");
  console.log("🔍 DIAGNOSING REPORT SUBMISSION & REVIEW SYSTEM");
  console.log("==================================================");

  // 1. Inspect existing reports
  const allReports = await prisma.report.findMany({
    include: {
      student: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      studentTask: { select: { id: true, status: true, dueAt: true } },
      feedbacks: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  console.log(`\n1. Found ${allReports.length} existing Report(s) in database:`);
  for (const r of allReports) {
    console.log(`- Report ID: ${r.id}`);
    console.log(`  Student: ${r.student.name} (${r.student.email})`);
    console.log(`  Task: ${r.task.title}`);
    console.log(`  GitHub URL: ${r.githubRepoUrl}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  StudentTask Status: ${r.studentTask.status}`);
    console.log(`  Final Marks: ${r.finalMarks}`);
    console.log(`  Feedbacks (${r.feedbacks.length}):`);
    for (const f of r.feedbacks) {
      console.log(`    * Type: ${f.type}, Marks: ${f.marks}, AI Model: ${f.aiModel || "N/A"}`);
    }
  }

  // 2. Check for any stuck reports (status = SUBMITTED without AI feedback)
  const stuckReports = allReports.filter((r) => r.status === ReportStatus.SUBMITTED);
  console.log(`\n2. Reports with status=SUBMITTED (awaiting or failed AI review): ${stuckReports.length}`);

  for (const sr of stuckReports) {
    console.log(`Attempting AI review for stuck report: ${sr.id} (${sr.githubRepoUrl})...`);
    try {
      await triggerAsyncAiReview(sr.id);
      const updated = await prisma.report.findUnique({
        where: { id: sr.id },
        include: { feedbacks: true },
      });
      console.log(`Result for ${sr.id}: Status is now ${updated?.status}, Feedbacks: ${updated?.feedbacks.length}`);
    } catch (err) {
      console.error(`AI review failed for ${sr.id}:`, err);
    }
  }

  // 3. Test GitHub Repo Snapshot Fetcher
  console.log("\n3. Testing GitHub repo snapshot fetcher on sample repos:");
  const testUrls = [
    "https://github.com/diya-patel/rate-limited-proxy",
    "https://github.com/torvalds/linux",
    "https://github.com/non-existent-user-12345/non-existent-repo-99999",
  ];

  for (const url of testUrls) {
    console.log(`\nFetching snapshot for: ${url}`);
    const snapshot = await fetchGitHubRepoSnapshot(url);
    console.log({
      owner: snapshot.owner,
      repo: snapshot.repo,
      isValid: snapshot.isValidRepo,
      error: snapshot.error || "none",
      commitsCount: snapshot.totalCommitsCount,
      filesSummaryCount: snapshot.fileTreeSummary?.length,
    });
  }

  await prisma.$disconnect();
}

diagnoseReports().catch((e) => {
  console.error("Diagnosis error:", e);
  process.exit(1);
});
