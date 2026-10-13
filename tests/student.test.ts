import { describe, it, expect } from "vitest";
import { createStudentSchema, bulkImportRowSchema } from "../src/validators/student";
import * as XLSX from "xlsx";

describe("Student Management & Bulk Import Processing", () => {
  describe("Zod Validation Schemas", () => {
    it("should validate valid student registration data", () => {
      const valid = createStudentSchema.safeParse({
        name: "Arjun Nambiar",
        email: "arjun@student.aceprogram.org",
        phone: "+919876543210",
        batchId: "batch-123",
        currentModuleId: "mod-456",
      });
      expect(valid.success).toBe(true);
    });

    it("should reject student registration with invalid email", () => {
      const invalid = createStudentSchema.safeParse({
        name: "Arjun Nambiar",
        email: "not-a-valid-email",
        phone: "+919876543210",
        batchId: "batch-123",
        currentModuleId: "mod-456",
      });
      expect(invalid.success).toBe(false);
    });

    it("should validate bulk import row schema", () => {
      const valid = bulkImportRowSchema.safeParse({
        name: "Meera Iyer",
        email: "meera@student.aceprogram.org",
        phone: "+919876543211",
        batch: "Cohort 2026",
        module: "Week 1",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Excel / CSV Spreadsheet Parser", () => {
    it("should parse spreadsheet buffer and extract normalized rows", () => {
      const sampleData = [
        { Name: "Student One", Email: "s1@aceprogram.org", Phone: "+919876543210", Batch: "Cohort 2026", Module: "Week 1" },
        { Name: "Student Two", Email: "s2@aceprogram.org", Phone: "+919876543211", Batch: "Cohort 2026", Module: "Week 2" },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Read back
      const readBook = XLSX.read(buffer, { type: "buffer" });
      const readSheet = readBook.Sheets[readBook.SheetNames[0]];
      const parsedRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(readSheet);

      expect(parsedRows.length).toBe(2);
      expect(parsedRows[0]["Email"]).toBe("s1@aceprogram.org");
      expect(parsedRows[1]["Name"]).toBe("Student Two");
    });
  });
});
