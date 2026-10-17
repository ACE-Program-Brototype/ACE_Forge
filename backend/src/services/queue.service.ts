import { triggerAsyncAiReview } from "./ai-review.service.js";

type JobType = "AI_REVIEW";

interface QueueJob {
  id: string;
  type: JobType;
  payload: { reportId: string };
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

class BackgroundQueueService {
  private queue: QueueJob[] = [];
  private isProcessing = false;
  private jobsMap = new Map<string, QueueJob>();

  /**
   * Enqueue an async AI review job for a report.
   * Returns immediately with job details.
   */
  public enqueueAiReview(reportId: string): { jobId: string; status: string } {
    const jobId = `job_review_${reportId}_${Date.now()}`;
    const job: QueueJob = {
      id: jobId,
      type: "AI_REVIEW",
      payload: { reportId },
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.queue.push(job);
    this.jobsMap.set(jobId, job);
    console.log(`📥 [QUEUE] Enqueued AI Review job: ${jobId} for report ${reportId}`);

    // Trigger processing tick asynchronously
    setImmediate(() => this.processNext());

    return { jobId, status: "QUEUED" };
  }

  public getJob(jobId: string): QueueJob | undefined {
    return this.jobsMap.get(jobId);
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    const job = this.queue.shift();
    if (!job) return;

    this.isProcessing = true;
    job.status = "PROCESSING";
    job.attempts += 1;
    job.updatedAt = new Date();

    console.log(`⚙️ [QUEUE] Processing job: ${job.id} (Attempt ${job.attempts}/${job.maxAttempts})...`);

    try {
      if (job.type === "AI_REVIEW") {
        await triggerAsyncAiReview(job.payload.reportId);
      }
      job.status = "COMPLETED";
      job.updatedAt = new Date();
      console.log(`✅ [QUEUE] Completed job: ${job.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      job.error = errorMsg;
      job.updatedAt = new Date();

      if (job.attempts < job.maxAttempts) {
        console.warn(`⚠️ [QUEUE] Job ${job.id} failed: ${errorMsg}. Re-queuing in 2s...`);
        job.status = "QUEUED";
        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, 2000);
      } else {
        job.status = "FAILED";
        console.error(`❌ [QUEUE] Job ${job.id} permanently failed after ${job.attempts} attempts: ${errorMsg}`);
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }
}

export const queueService = new BackgroundQueueService();
