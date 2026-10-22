import nodemailer from "nodemailer";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { EmailType, EmailStatus } from "@prisma/client";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  studentId?: string;
  studentTaskId?: string;
  type: EmailType;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  studentId,
  studentTaskId,
  type,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const isDevMode =
    process.env.EMAIL_DEV_MODE === "true" ||
    env.EMAIL_DEV_MODE ||
    !env.SMTP_USER;

  if (isDevMode) {
    console.log("------------------------------------------------------------");
    console.log(`📨 [DEV EMAIL DISPATCH] Type: ${type}`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:\n${text}`);
    console.log("------------------------------------------------------------");

    try {
      await prisma.emailLog.create({
        data: {
          studentId: studentId || null,
          studentTaskId: studentTaskId || null,
          type,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.error("Failed to persist EmailLog:", dbErr);
    }

    return { success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST || "localhost",
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM || "ACE Forge <noreply@aceprogram.org>",
      to,
      subject,
      text,
      html,
    });

    await prisma.emailLog.create({
      data: {
        studentId: studentId || null,
        studentTaskId: studentTaskId || null,
        type,
        status: EmailStatus.SENT,
        sentAt: new Date(),
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ Email dispatch failed to ${to}:`, errorMessage);

    try {
      await prisma.emailLog.create({
        data: {
          studentId: studentId || null,
          studentTaskId: studentTaskId || null,
          type,
          status: EmailStatus.FAILED,
          error: errorMessage,
          sentAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.error("Failed to record failed EmailLog:", dbErr);
    }

    return { success: false, error: errorMessage };
  }
}
