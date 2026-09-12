import nodemailer from 'nodemailer';

export interface SendOtpMailOptions {
  to: string;
  otp: string;
}

/**
 * Creates and returns a Nodemailer Transporter based on environment variables.
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    // If user/pass are missing, return null to indicate fallback logging
    return null;
  }

  // Optimized configuration for Gmail
  if (process.env.SMTP_SERVICE === 'gmail' || (host && host.includes('gmail'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 or other ports
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert or local TLS handshake issues
    },
  });
};

/**
 * Sends a 6-digit OTP verification email via Nodemailer.
 */
export const sendOtpEmail = async ({ to, otp }: SendOtpMailOptions): Promise<{ success: boolean; simulated?: boolean }> => {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || '"TVTI Institute" <admissions@tvti.edu>';
  const transporter = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TVTI Email Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1a1a1a; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; }
        .header h1 { color: #f97316; margin: 0; font-size: 24px; letter-spacing: 0.5px; }
        .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 32px 28px; text-align: center; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 12px; }
        .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #fff7ed; border: 2px dashed #f97316; border-radius: 10px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px auto; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ea580c; margin: 0; font-family: monospace; }
        .expiry-note { font-size: 13px; color: #64748b; margin-bottom: 20px; }
        .security-note { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TVTI</h1>
          <p>Technical & Vocational Training Institute</p>
        </div>
        <div class="content">
          <h2 class="title">Email Verification Code</h2>
          <p class="description">
            Thank you for applying to the Technical & Vocational Training Institute. Please use the 6-digit verification code below to verify your email address and continue your course application.
          </p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p class="expiry-note">
            ⏳ This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.
          </p>
          <p class="security-note">
            If you did not request this verification, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} TVTI - Technical & Vocational Training Institute. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[DEV OTP EMAIL NOTICE]`);
    console.log(`To: ${to}`);
    console.log(`OTP Code: [ ${otp} ]`);
    console.log(`Valid for 10 minutes`);
    console.log(`(Configure SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env for real SMTP delivery)`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  await transporter.sendMail({
    from,
    to,
    subject: `TVTI Application - Your Email Verification Code: ${otp}`,
    text: `Your TVTI Verification Code is: ${otp}. It expires in 10 minutes. Do not share this code.`,
    html: htmlContent,
  });

  return { success: true };
};
