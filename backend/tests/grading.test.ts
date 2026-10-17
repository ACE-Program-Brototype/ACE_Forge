import { describe, it, expect } from "vitest";
import { employeeGradeSchema } from "../src/validators/grading";

describe("Employee Grading & Feedback Validation", () => {
  it("should validate valid employee grading input", () => {
    const valid = employeeGradeSchema.safeParse({
      employeeMarks: 85,
      comments: "Outstanding work on the concurrency benchmarks.",
      finalMarks: 85,
      strengths: ["Clean code structure"],
      improvements: ["Add more integration tests"],
    });

    expect(valid.success).toBe(true);
  });

  it("should reject employee marks greater than 100", () => {
    const invalid = employeeGradeSchema.safeParse({
      employeeMarks: 105,
      comments: "Outstanding work",
      finalMarks: 100,
    });

    expect(invalid.success).toBe(false);
  });

  it("should reject negative final marks", () => {
    const invalid = employeeGradeSchema.safeParse({
      employeeMarks: 50,
      comments: "Good effort",
      finalMarks: -5,
    });

    expect(invalid.success).toBe(false);
  });

  it("should reject empty or very short comments", () => {
    const invalid = employeeGradeSchema.safeParse({
      employeeMarks: 75,
      comments: "Ok",
      finalMarks: 75,
    });

    expect(invalid.success).toBe(false);
  });
});
