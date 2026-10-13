import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createAdminSchema } from "@/validators/team";
import { sendEmail } from "@/lib/email";
import { Role, EmailType } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdmin([Role.SUPER_ADMIN]);

    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, admins });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/team error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await requireAdmin([Role.SUPER_ADMIN]);

    const body = await req.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Check if email already in use
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An administrator with this email already exists." },
        { status: 400 }
      );
    }

    // Generate or use provided password
    const temporaryPassword =
      parsed.data.password ||
      `ACE-${Math.random().toString(36).substring(2, 8).toUpperCase()}!${Math.floor(10 + Math.random() * 90)}`;

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: parsed.data.role,
        isActive: true,
        createdById: currentAdmin.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send welcome invite email
    const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const emailBody = `Hello ${newAdmin.name},

You have been granted administrative privileges on the ACE Forge platform as a ${newAdmin.role}.

Login URL: ${appUrl}/admin/login
Email: ${newAdmin.email}
Temporary Password: ${temporaryPassword}

Please log in and update your credentials immediately upon first access.

Best regards,
ACE Engineering Leadership Team`;

    await sendEmail({
      to: newAdmin.email,
      subject: "Invitation to ACE Forge Admin Portal",
      text: emailBody,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #002C5F;">Welcome to the ACE Forge Team</h2>
        <p>Hello <strong>${newAdmin.name}</strong>,</p>
        <p>You have been assigned the role of <strong>${newAdmin.role}</strong>.</p>
        <p><strong>Login URL:</strong> <a href="${appUrl}/admin/login">${appUrl}/admin/login</a><br>
        <strong>Email:</strong> ${newAdmin.email}<br>
        <strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
        <p style="color: #64748B;">Please change your password after initial sign-in.</p>
      </div>`,
      type: EmailType.OTHER,
    });

    return NextResponse.json({
      success: true,
      admin: newAdmin,
      temporaryPassword,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/team error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
