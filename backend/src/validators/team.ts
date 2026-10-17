import { z } from "zod";

export const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

export const updateAdminSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).optional(),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
