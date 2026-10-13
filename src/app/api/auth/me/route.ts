import { NextResponse } from "next/server";
import { getAdminSession, getStudentSession } from "@/lib/auth";

export async function GET() {
  const adminSession = await getAdminSession();
  if (adminSession) {
    return NextResponse.json({
      authenticated: true,
      userType: "ADMIN",
      user: adminSession.admin,
    });
  }

  const studentSession = await getStudentSession();
  if (studentSession) {
    return NextResponse.json({
      authenticated: true,
      userType: "STUDENT",
      user: studentSession.student,
    });
  }

  return NextResponse.json({
    authenticated: false,
    userType: null,
    user: null,
  });
}
