import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validators/auth";
import { signAuthToken } from "@/lib/jwt";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limiter";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
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
    const rateLimitKey = `rate:admin:login:${ip}:${email}`;
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

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    resetRateLimit(rateLimitKey);

    const token = await signAuthToken({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      userType: "ADMIN",
    });

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during admin authentication" },
      { status: 500 }
    );
  }
}
