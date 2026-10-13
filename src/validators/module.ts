import { z } from "zod";

export const createModuleSchema = z.object({
  name: z.string().trim().min(2, "Module name must be at least 2 characters"),
  orderIndex: z.coerce.number().int().min(1, "Order index must be at least 1"),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
});

export const updateModuleSchema = z.object({
  name: z.string().trim().min(2, "Module name must be at least 2 characters").optional(),
  orderIndex: z.coerce.number().int().min(1).optional(),
  description: z.string().trim().min(5).optional(),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
