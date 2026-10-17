import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Task title must be at least 3 characters"),
  description: z.string().trim().min(10, "Task description must be at least 10 characters"),
  referenceLink: z
    .string()
    .trim()
    .url("Reference link must be a valid URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
  moduleId: z.string().min(1, "Module ID is required"),
  isActive: z.boolean().default(true),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3, "Task title must be at least 3 characters").optional(),
  description: z.string().trim().min(10, "Task description must be at least 10 characters").optional(),
  referenceLink: z
    .string()
    .trim()
    .url("Reference link must be a valid URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
  moduleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
