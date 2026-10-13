import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { assignModuleTasksToStudent } from "@/services/task-assignment.service";
import { sendEmail } from "@/lib/email";
import { EmailType, StudentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

interface RowError {
  row: number;
  email?: string;
  error: string;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Please upload a CSV or Excel file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet contains no sheets." },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "The uploaded spreadsheet contains no data rows." },
        { status: 400 }
      );
    }

    // Preload existing batches, modules, and registered emails for fast lookup
    const allBatches = await prisma.batch.findMany();
    const allModules = await prisma.module.findMany();
    const existingEmails = new Set(
      (await prisma.student.findMany({ select: { email: true } })).map((s) => s.email.toLowerCase())
    );

    const errors: RowError[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // Row index accounting for header
      const row = rawRows[i];

      // Normalize keys by trimming and lower-casing
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[k.trim().toLowerCase()] = String(v ?? "").trim();
      }

      const name = normalized["name"] || normalized["student name"] || normalized["fullname"];
      const email = (normalized["email"] || normalized["student email"])?.toLowerCase();
      const phone = normalized["phone"] || normalized["phone number"] || normalized["mobile"];
      const batchRef = normalized["batch"] || normalized["cohort"];
      const moduleRef = normalized["module"] || normalized["week"];

      if (!name || !email || !phone || !batchRef || !moduleRef) {
        errors.push({
          row: rowNum,
          email: email || "N/A",
          error: "Missing required column(s). Required: name, email, phone, batch, module.",
        });
        continue;
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          row: rowNum,
          email,
          error: "Invalid email address format.",
        });
        continue;
      }

      // Check duplicate
      if (existingEmails.has(email)) {
        skippedCount++;
        errors.push({
          row: rowNum,
          email,
          error: "Email already exists in the system (skipped).",
        });
        continue;
      }

      // Resolve batch
      const matchedBatch = allBatches.find(
        (b) =>
          b.id === batchRef ||
          b.name.toLowerCase() === batchRef.toLowerCase() ||
          b.name.toLowerCase().includes(batchRef.toLowerCase())
      );

      if (!matchedBatch) {
        errors.push({
          row: rowNum,
          email,
          error: `Batch "${batchRef}" not found in database.`,
        });
        continue;
      }

      // Resolve module
      const matchedModule = allModules.find((m) => {
        if (m.id === moduleRef) return true;
        if (m.name.toLowerCase() === moduleRef.toLowerCase()) return true;
        if (m.name.toLowerCase().includes(moduleRef.toLowerCase())) return true;
        const parsedOrder = parseInt(moduleRef.replace(/\D/g, ""), 10);
        return !isNaN(parsedOrder) && m.orderIndex === parsedOrder;
      });

      if (!matchedModule) {
        errors.push({
          row: rowNum,
          email,
          error: `Module "${moduleRef}" not found in database.`,
        });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(phone, 10);
        const student = await prisma.student.create({
          data: {
            name,
            email,
            phone,
            passwordHash,
            batchId: matchedBatch.id,
            currentModuleId: matchedModule.id,
            status: StudentStatus.ACTIVE,
            mustChangePassword: true,
            createdById: admin.id,
          },
        });

        existingEmails.add(email);
        importedCount++;

        // Assign module tasks
        await assignModuleTasksToStudent(student.id, matchedModule.id);

        // Send welcome email
        const emailBody = `Welcome to ACE Forge, ${student.name}!

Your student portal account has been created via cohort bulk enrollment.

Portal URL: ${appUrl}/login
Username: ${student.email}
Initial Temporary Password: ${student.phone}

IMPORTANT SECURITY NOTICE:
Your initial password is your phone number (${student.phone}).
You will be required to establish a secure password upon your first sign in.

Best regards,
ACE Engineering Faculty`;

        await sendEmail({
          to: student.email,
          studentId: student.id,
          type: EmailType.WELCOME,
          subject: "Welcome to ACE Forge — Cohort Enrollment & Temporary Credentials",
          text: emailBody,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #002C5F;">Welcome to ACE Forge</h2>
            <p>Hello <strong>${student.name}</strong>,</p>
            <p>You have been enrolled in <strong>${matchedBatch.name}</strong> at <strong>${matchedModule.name}</strong>.</p>
            <p><strong>Login URL:</strong> <a href="${appUrl}/login">${appUrl}/login</a><br>
            <strong>Username:</strong> ${student.email}<br>
            <strong>Temporary Password:</strong> ${student.phone}</p>
            <p style="color: #8C5800;">Note: You must change your password on first login.</p>
          </div>`,
        });
      } catch (insertErr) {
        console.error(`Row ${rowNum} insert failed:`, insertErr);
        errors.push({
          row: rowNum,
          email,
          error: "Failed to persist student record in database.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rawRows.length,
        importedCount,
        skippedCount,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/students/import error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
