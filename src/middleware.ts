import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AdminTokenPayload, StudentTokenPayload } from "@/lib/jwt";
import { ADMIN_COOKIE_NAME, STUDENT_COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Admin Routes
  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const adminPayload = adminToken
      ? await verifyAuthToken<AdminTokenPayload>(adminToken)
      : null;

    if (pathname === "/admin/login") {
      if (adminPayload && adminPayload.userType === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!adminPayload || adminPayload.userType !== "ADMIN") {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 2. Student Authentication & Password Enforcement
  const isStudentProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/reports") ||
    pathname === "/change-password";

  const studentToken = request.cookies.get(STUDENT_COOKIE_NAME)?.value;
  const studentPayload = studentToken
    ? await verifyAuthToken<StudentTokenPayload>(studentToken)
    : null;

  if (pathname === "/login") {
    if (studentPayload && studentPayload.userType === "STUDENT") {
      if (studentPayload.mustChangePassword) {
        return NextResponse.redirect(new URL("/change-password", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isStudentProtectedRoute) {
    if (!studentPayload || studentPayload.userType !== "STUDENT") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Force password change on first login
    if (studentPayload.mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    // Prevent visiting change-password if not required
    if (!studentPayload.mustChangePassword && pathname === "/change-password") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/dashboard/:path*",
    "/tasks/:path*",
    "/reports/:path*",
    "/change-password",
  ],
};
