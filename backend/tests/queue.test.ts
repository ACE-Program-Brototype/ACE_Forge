import { describe, it, expect, vi, beforeEach } from "vitest";
import { queueService } from "../src/services/queue.service.js";
import * as aiReviewService from "../src/services/ai-review.service.js";

describe("Background Queue Service (queue.service.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should synchronously return a job id and QUEUED status when enqueuing", () => {
    vi.spyOn(aiReviewService, "triggerAsyncAiReview").mockResolvedValue(undefined as any);

    const result = queueService.enqueueAiReview("report_test_sync_1");

    expect(result).toHaveProperty("jobId");
    expect(result.status).toBe("QUEUED");
    expect(result.jobId).toContain("job_review_report_test_sync_1");

    const job = queueService.getJob(result.jobId);
    expect(job).toBeDefined();
    expect(job?.payload.reportId).toBe("report_test_sync_1");
  });

  it("should process the job asynchronously and transition to COMPLETED", async () => {
    let resolved = false;
    vi.spyOn(aiReviewService, "triggerAsyncAiReview").mockImplementation(async (reportId: string) => {
      expect(reportId).toBe("report_test_async_2");
      resolved = true;
      return undefined as any;
    });

    const { jobId } = queueService.enqueueAiReview("report_test_async_2");

    // Wait for the tick
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(resolved).toBe(true);
    const job = queueService.getJob(jobId);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.attempts).toBe(1);
  });

  it("should record error message and increment attempts when triggerAsyncAiReview fails", async () => {
    vi.spyOn(aiReviewService, "triggerAsyncAiReview").mockRejectedValue(
      new Error("GitHub API rate limit exceeded")
    );

    const { jobId } = queueService.enqueueAiReview("report_fail_test_3");

    // Wait for initial processing tick
    await new Promise((resolve) => setTimeout(resolve, 50));

    const job = queueService.getJob(jobId);
    expect(job).toBeDefined();
    expect(job?.error).toContain("GitHub API rate limit exceeded");
    expect(job?.attempts).toBeGreaterThanOrEqual(1);
  });

  it("should handle multiple enqueued jobs sequentially without unhandled rejection", async () => {
    const processedReports: string[] = [];
    vi.spyOn(aiReviewService, "triggerAsyncAiReview").mockImplementation(async (reportId: string) => {
      processedReports.push(reportId);
      return undefined as any;
    });

    const job1 = queueService.enqueueAiReview("batch_report_1");
    const job2 = queueService.enqueueAiReview("batch_report_2");
    const job3 = queueService.enqueueAiReview("batch_report_3");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(processedReports).toContain("batch_report_1");
    expect(processedReports).toContain("batch_report_2");
    expect(processedReports).toContain("batch_report_3");

    expect(queueService.getJob(job1.jobId)?.status).toBe("COMPLETED");
    expect(queueService.getJob(job2.jobId)?.status).toBe("COMPLETED");
    expect(queueService.getJob(job3.jobId)?.status).toBe("COMPLETED");
  });
});
