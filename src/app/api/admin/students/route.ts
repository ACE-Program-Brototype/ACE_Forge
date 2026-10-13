import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createStudentSchema } from "@/validators/student";
import { assignModuleTasksToStudent } from "@/services/task-assignment.service";
import { sendEmail } from "@/lib/email";
import { EmailType, StudentStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const batchId = searchParams.get("batchId");
    const moduleId = searchParams.get("moduleId");
    const status = searchParams.get("status") as StudentStatus | null;

    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (batchId) where.batchId = batchId;
    if (moduleId) where.currentModuleId = moduleId;
    if (status && (status === "ACTIVE" || status === "INACTIVE")) {
      where.status = status;
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true, orderIndex: true } },
        _count: {
          select: {
            studentTasks: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/students error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Check if email already registered
    const existing = await prisma.student.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A student with this email address is already enrolled." },
        { status: 400 }
      );
    }

    // Initial student password is their phone number
    const passwordHash = await bcrypt.hash(parsed.data.phone, 10);

    const student = await prisma.student.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone,
        passwordHash,
        batchId: parsed.data.batchId,
        currentModuleId: parsed.data.currentModuleId,
        status: StudentStatus.ACTIVE,
        mustChangePassword: true,
        createdById: admin.id,
      },
      include: {
        batch: { select: { id: true, name: true } },
        currentModule: { select: { id: true, name: true } },
      },
    });

    // Automatically assign tasks from the current module
    await assignModuleTasksToStudent(student.id, student.currentModuleId);

    // Send Welcome Email
    const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const emailBody = `Welcome to ACE Forge, ${student.name}!

Your student portal account has been successfully created.

Portal URL: ${appUrl}/login
Username: ${student.email}
Initial Temporary Password: ${student.phone}

IMPORTANT SECURITY NOTICE:
Your initial temporary password is your registered phone number (${student.phone}).
Upon your initial login, you will be required to establish a private, strong password before accessing your weekly engineering tasks.

Best regards,
ACE Engineering Program Leadership`;

    await sendEmail({
      to: student.email,
      studentId: student.id,
      type: EmailType.WELCOME,
      subject: "Welcome to ACE Forge — Student Portal Access & Credentials",
      text: emailBody,
      html: `<div style="font-family: sans-serif; padding: 24px; color: #002C5F;">
        <h2 style="color: #002C5F;">Welcome to ACE Forge</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>You have been enrolled in <strong>${student.batch.name}</strong> at <strong>${student.currentModule.name}</strong>.</p>
        <div style="background-color: #EEF3F9; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Portal Login:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
          <p style="margin: 0 0 8px 0;"><strong>Username:</strong> ${student.email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${student.phone}</p>
        </div>
        <p style="color: #8C5800; font-size: 13px;">
          ⚠️ <strong>Mandatory First-Login Password Change:</strong> You must change this temporary password immediately upon signing in.
        </p>
      </div>`,
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/students error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
