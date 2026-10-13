import { z } from "zod";

export const employeeGradeSchema = z.object({
  employeeMarks: z.coerce
    .number()
    .int()
    .min(0, "Marks must be between 0 and 100")
    .max(100, "Marks cannot exceed 100"),
  comments: z
    .string()
    .trim()
    .min(5, "Please provide meaningful feedback comments (minimum 5 characters)"),
  finalMarks: z.coerce
    .number()
    .int()
    .min(0, "Final marks must be between 0 and 100")
    .max(100, "Final marks cannot exceed 100"),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
});

export type EmployeeGradeInput = z.infer<typeof employeeGradeSchema>;
