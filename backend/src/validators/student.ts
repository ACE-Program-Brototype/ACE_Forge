import { z } from "zod";

export const createStudentSchema = z.object({
  name: z.string().trim().min(2, "Student name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().min(6, "Phone number must be at least 6 characters"),
  batchId: z.string().min(1, "Batch is required"),
  currentModuleId: z.string().min(1, "Module is required"),
});

export const updateStudentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(6).optional(),
  batchId: z.string().optional(),
  currentModuleId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const bulkImportRowSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  phone: z.string().trim().min(6, "Phone number is required"),
  batch: z.string().trim().min(1, "Batch name is required"),
  module: z.string().trim().min(1, "Module name or number is required"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type BulkImportRowInput = z.infer<typeof bulkImportRowSchema>;
