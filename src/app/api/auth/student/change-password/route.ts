import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/validators/auth";
import { getStudentSession, STUDENT_COOKIE_NAME } from "@/lib/auth";
import { signAuthToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in first" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: session.student.id },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const isCurrentValid = await bcrypt.compare(parsed.data.currentPassword, student.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: "The current password you provided is incorrect" },
        { status: 400 }
      );
    }

    // Ensure the new password is not the phone number
    if (parsed.data.newPassword === student.phone) {
      return NextResponse.json(
        { success: false, error: "New password cannot be your phone number" },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    // Re-sign token with mustChangePassword: false
    const token = await signAuthToken({
      sub: updatedStudent.id,
      email: updatedStudent.email,
      name: updatedStudent.name,
      mustChangePassword: false,
      userType: "STUDENT",
    });

    const response = NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });

    response.cookies.set({
      name: STUDENT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while updating your password" },
      { status: 500 }
    );
  }
}
