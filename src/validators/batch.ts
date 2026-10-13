import { z } from "zod";

export const createBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters"),
  startDate: z.string().or(z.date()),
  status: z.enum(["ACTIVE", "COMPLETED"]).default("ACTIVE"),
});

export const updateBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters").optional(),
  startDate: z.string().or(z.date()).optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
