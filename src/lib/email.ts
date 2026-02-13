import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.smtp.user || !env.smtp.pass) {
    console.warn("SMTP credentials missing. Skipping email send.");
    console.log(`To: ${to}\nSubject: ${subject}\nContent: ${html}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
  });
}

export function generateResetPasswordEmail(resetLink: string) {
  return `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset for your Pinnacle Metals account.</p>
    <p>Click the link below to set a new password. This link will expire in 1 hour.</p>
    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;
}

export function generateVerificationEmail(verificationLink: string) {
  return `
    <h1>Verify Your Email</h1>
    <p>Thank you for registering with Pinnacle Metals.</p>
    <p>Please click the link below to verify your email address and activate your account.</p>
    <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
    <p>If you didn't register, please ignore this email.</p>
  `;
}
