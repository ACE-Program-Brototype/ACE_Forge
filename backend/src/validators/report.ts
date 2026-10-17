import { z } from "zod";

export const githubRepoRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*|\?.*)?$/;

export const reportSubmissionSchema = z.object({
  studentTaskId: z.string().min(1, "Student task ID is required"),
  title: z
    .string()
    .trim()
    .min(3, "Report title must be at least 3 characters")
    .max(200, "Report title cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Please provide a detailed report of what you learned (minimum 20 characters)")
    .max(10000, "Report description is too long"),
  githubRepoUrl: z
    .string()
    .trim()
    .url("Please enter a valid URL")
    .regex(githubRepoRegex, "URL must be a valid GitHub repository (e.g., https://github.com/username/repository)"),
  aiDeclarationAccepted: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the declaration confirming this is your original work and acknowledging the AI disqualification policy.",
    }),
  }),
});

export type ReportSubmissionInput = z.infer<typeof reportSubmissionSchema>;
