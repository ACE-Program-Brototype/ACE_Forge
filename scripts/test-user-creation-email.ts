import { sendEmail } from "../src/lib/email";
import { prisma } from "../src/lib/prisma";
import { EmailType, EmailStatus } from "@prisma/client";

async function testUserCredentialsEmail() {
  const targetEmail = process.env.SMTP_USER || "brototype.studentexcellence@gmail.com";
  const appUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  console.log(`\n======================================================`);
  console.log(`📧 TESTING USER CREATION CREDENTIALS EMAIL DISPATCH`);
  console.log(`======================================================`);
  console.log(`Target Recipient: ${targetEmail}`);
  console.log(`App URL:          ${appUrl}`);
  console.log(`EMAIL_DEV_MODE:   ${process.env.EMAIL_DEV_MODE}`);
  console.log(`SMTP_HOST:        ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT:        ${process.env.SMTP_PORT}`);
  console.log(`SMTP_USER:        ${process.env.SMTP_USER}`);

  // Test 1: Student Welcome Email with Initial Password (Phone number)
  const studentDemo = {
    id: "test-student-" + Date.now(),
    name: "Test Enrolled Student",
    email: targetEmail, // send to user's real email to test actual delivery
    phone: "+91-9876543210",
    batchName: "Cohort 2026-A",
    moduleName: "Week 1: Fundamentals",
  };

  const studentEmailBody = `Welcome to ACE Forge, ${studentDemo.name}!

Your student portal account has been successfully created.

Portal URL: ${appUrl}/login
Username: ${studentDemo.email}
Initial Temporary Password: ${studentDemo.phone}

IMPORTANT SECURITY NOTICE:
Your initial temporary password is your registered phone number (${studentDemo.phone}).
Upon your initial login, you will be required to establish a private, strong password before accessing your weekly engineering tasks.

Best regards,
ACE Engineering Program Leadership`;

  console.log("\n1. Dispatching Student Welcome Email...");
  const studentResult = await sendEmail({
    to: studentDemo.email,
    type: EmailType.WELCOME,
    subject: "Welcome to ACE Forge — Student Portal Access & Credentials",
    text: studentEmailBody,
    html: `<div style="font-family: Arial, sans-serif; padding: 24px; color: #002C5F; background: #f9f9fb; border-radius: 8px;">
      <h2 style="color: #002C5F; margin-top: 0;">Welcome to ACE Forge</h2>
      <p>Dear <strong>${studentDemo.name}</strong>,</p>
      <p>You have been enrolled in <strong>${studentDemo.batchName}</strong> at <strong>${studentDemo.moduleName}</strong>.</p>
      <div style="background-color: #EEF3F9; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #002C5F;">
        <p style="margin: 0 0 8px 0;"><strong>Portal Login:</strong> <a href="${appUrl}/login" style="color: #002C5F; font-weight: bold;">${appUrl}/login</a></p>
        <p style="margin: 0 0 8px 0;"><strong>Username:</strong> <code>${studentDemo.email}</code></p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code>${studentDemo.phone}</code></p>
      </div>
      <p style="color: #8C5800; font-size: 13px;">
        ⚠️ <strong>Mandatory First-Login Password Change:</strong> You must change this temporary password immediately upon signing in.
      </p>
    </div>`,
  });

  console.log("Student Email Send Result:", studentResult);

  // Test 2: Admin Invite Email with Generated Temporary Password
  const adminDemo = {
    name: "Test Admin Faculty",
    email: targetEmail,
    role: "ADMIN",
    temporaryPassword: "ACE-TEMP-PASS-2026!",
  };

  const adminEmailBody = `Hello ${adminDemo.name},

You have been granted administrative privileges on the ACE Forge platform as a ${adminDemo.role}.

Login URL: ${appUrl}/admin/login
Email: ${adminDemo.email}
Temporary Password: ${adminDemo.temporaryPassword}

Please log in and update your credentials immediately upon first access.

Best regards,
ACE Engineering Leadership Team`;

  console.log("\n2. Dispatching Admin Team Invitation Email...");
  const adminResult = await sendEmail({
    to: adminDemo.email,
    type: EmailType.OTHER,
    subject: "Invitation to ACE Forge Admin Portal",
    text: adminEmailBody,
    html: `<div style="font-family: Arial, sans-serif; padding: 24px; color: #002C5F; background: #f9f9fb; border-radius: 8px;">
      <h2 style="color: #002C5F; margin-top: 0;">Welcome to the ACE Forge Team</h2>
      <p>Hello <strong>${adminDemo.name}</strong>,</p>
      <p>You have been assigned the role of <strong>${adminDemo.role}</strong>.</p>
      <div style="background-color: #EEF3F9; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #FCAC04;">
        <p style="margin: 0 0 8px 0;"><strong>Login URL:</strong> <a href="${appUrl}/admin/login" style="color: #002C5F; font-weight: bold;">${appUrl}/admin/login</a></p>
        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> <code>${adminDemo.email}</code></p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code>${adminDemo.temporaryPassword}</code></p>
      </div>
      <p style="color: #64748B; font-size: 13px;">Please change your password after initial sign-in.</p>
    </div>`,
  });

  console.log("Admin Email Send Result:", adminResult);

  // Check Database EmailLog
  console.log("\n3. Querying EmailLog from PostgreSQL...");
  const latestLogs = await prisma.emailLog.findMany({
    take: 5,
    orderBy: { sentAt: "desc" },
  });

  console.log(`Found ${latestLogs.length} recent EmailLog entries:`);
  for (const log of latestLogs) {
    console.log(`- [${log.sentAt.toISOString()}] Type: ${log.type}, Status: ${log.status}, Error: ${log.error || "none"}`);
  }

  await prisma.$disconnect();
}

testUserCredentialsEmail().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
