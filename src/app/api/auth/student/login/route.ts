import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validators/auth";
import { signAuthToken } from "@/lib/jwt";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limiter";
import { STUDENT_COOKIE_NAME } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const rateLimitKey = `rate:student:login:${ip}:${email}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { email },
    });

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(parsed.data.password, student.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    resetRateLimit(rateLimitKey);

    const token = await signAuthToken({
      sub: student.id,
      email: student.email,
      name: student.name,
      mustChangePassword: student.mustChangePassword,
      userType: "STUDENT",
    });

    const response = NextResponse.json({
      success: true,
      mustChangePassword: student.mustChangePassword,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
    });

    response.cookies.set({
      name: STUDENT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
