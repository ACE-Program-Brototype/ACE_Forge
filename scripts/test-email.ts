import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT) || 465;
const secure = port === 465;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || user;

console.log("Testing SMTP connection with:", { host, port, secure, user, from });

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

async function main() {
  try {
    console.log("Verifying transporter connection...");
    await transporter.verify();
    console.log("✅ Transporter verified successfully!");

    console.log(`Sending test email to ${user}...`);
    const info = await transporter.sendMail({
      from,
      to: user, // send to self
      subject: "ACE Forge — SMTP Credentials Test",
      text: "This is a verification test to confirm email delivery is working correctly.",
      html: "<p>This is a verification test to confirm email delivery is working correctly.</p>",
    });

    console.log("✅ Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Email test failed:", err);
  }
}

main();
