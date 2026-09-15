import dns from 'dns';
import nodemailer from 'nodemailer';

if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch (e) {}
}

export interface SendOtpMailOptions {
  to: string;
  otp: string;
}

export interface SendApplicationSubmissionEmailOptions {
  to: string;
  studentName: string;
}

export interface SendApprovalCredentialsEmailOptions {
  to: string;
  studentName: string;
  indexNumber: string;
  tempPassword: string;
}

export interface SendPasswordResetEmailOptions {
  to: string;
  resetLink: string;
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
    return null;
  }

  if (process.env.SMTP_SERVICE === 'gmail' || (host && host.includes('gmail'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
  }

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const DEFAULT_FROM_ADDRESS = process.env.MAIL_FROM || process.env.SMTP_FROM || '"Twintec Vocational Training Institute" <admissions@tvti.edu>';

const renderHeaderCard = () => `
  <div class="header">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px auto;">
      <tr>
        <td align="center" style="background: #ea580c; width: 52px; height: 52px; border-radius: 14px; text-align: center; vertical-align: middle; color: #ffffff; font-size: 26px; font-weight: 900; font-family: Arial, sans-serif;">
          T
        </td>
      </tr>
    </table>
    <h1>TWINTEC VOCATIONAL TRAINING INSTITUTE</h1>
    <p>OFFICIAL ADMISSIONS PORTAL</p>
  </div>
`;

/**
 * Sends a 6-digit OTP verification email via Nodemailer.
 */
export const sendOtpEmail = async ({ to, otp }: SendOtpMailOptions): Promise<{ success: boolean; simulated?: boolean }> => {
  const from = DEFAULT_FROM_ADDRESS;
  const transporter = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Twintec Email Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 3px solid #ea580c; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; }
        .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
        .content { padding: 36px 32px; text-align: center; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 28px; }
        .otp-box { background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 20px 32px; display: inline-block; margin: 0 auto 24px auto; }
        .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ea580c; margin: 0; font-family: 'Courier New', Courier, monospace; }
        .expiry-note { font-size: 13px; color: #64748b; margin-bottom: 24px; font-weight: 500; }
        .security-note { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5; text-align: left; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderHeaderCard()}
        <div class="content">
          <h2 class="title">Email Address Verification</h2>
          <p class="description">
            Thank you for initiating your registration with Twintec Vocational Training Institute. Please enter the verification code below to confirm your email address.
          </p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p class="expiry-note">
            Verification Code Expiry: <strong>10 Minutes</strong>
          </p>
          <div class="security-note">
            <strong>Security Notice:</strong> This single-use verification code is intended solely for the recipient. If you did not initiate this request, please disregard this communication.
          </div>
        </div>
        <div class="footer">
          Twintec Vocational Training Institute &bull; Official Communication
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: `Twintec Verification Code: ${otp}`,
        text: `Your Twintec Verification Code is: ${otp}. It expires in 10 minutes.`,
        html: htmlContent,
      });
      return { success: true };
    } catch (err: any) {
      console.warn(`[OTP EMAIL SMTP WARNING] (${err?.message || err}). Falling back to dev logger.`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`[DEV OTP EMAIL NOTICE]`);
  console.log(`To: ${to}`);
  console.log(`OTP Code: [ ${otp} ]`);
  console.log(`Valid for 10 minutes`);
  console.log(`======================================================\n`);
  return { success: true, simulated: true };
};

/**
 * Sends a confirmation email when a student registers (Status: Pending Review).
 */
export const sendApplicationSubmissionEmail = async ({ to, studentName }: SendApplicationSubmissionEmailOptions): Promise<{ success: boolean; simulated?: boolean }> => {
  const from = DEFAULT_FROM_ADDRESS;
  const transporter = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Twintec Application Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 3px solid #ea580c; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; }
        .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
        .content { padding: 36px 32px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .status-box { background: #f8fafc; border-left: 4px solid #f59e0b; padding: 18px 20px; border-radius: 4px; margin-bottom: 24px; }
        .status-title { font-size: 12px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0; }
        .status-desc { font-size: 13.5px; color: #334155; margin: 0; line-height: 1.5; }
        .info-card { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px; }
        .info-card-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-card-text { font-size: 13.5px; color: #475569; margin: 0; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderHeaderCard()}
        <div class="content">
          <h2 class="title">Application Submission Confirmation</h2>
          <p class="description">
            Dear <strong>${studentName}</strong>,<br><br>
            Your application for course enrollment has been successfully submitted to Twintec Vocational Training Institute.
          </p>

          <div class="status-box">
            <div class="status-title">Application Status: Pending Review</div>
            <div class="status-desc">Your registration documents and program preferences are currently undergoing formal administrative evaluation.</div>
          </div>

          <div class="info-card">
            <div class="info-card-title">Official Portal Credentials Notice</div>
            <div class="info-card-text">
              Upon approval of your application by the Twintec Admissions Board, your official <strong>Registration Number (Index No)</strong> and temporary login password will be dispatched to this email address.
            </div>
          </div>
        </div>
        <div class="footer">
          Twintec Vocational Training Institute &bull; Official Communication
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: `Twintec Course Application Confirmation - ${studentName}`,
        text: `Dear ${studentName}, your Twintec application has been received and is pending administrative review.`,
        html: htmlContent,
      });
      return { success: true };
    } catch (err: any) {
      console.warn(`[SUBMISSION EMAIL SMTP WARNING] (${err?.message || err}). Falling back to dev logger.`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`[DEV SUBMISSION EMAIL NOTICE]`);
  console.log(`To: ${to}`);
  console.log(`Student: ${studentName}`);
  console.log(`Status: PENDING ADMIN REVIEW`);
  console.log(`======================================================\n`);
  return { success: true, simulated: true };
};

/**
 * Sends official approval email containing Student Registration No and Temporary Password.
 */
export const sendApprovalCredentialsEmail = async ({
  to,
  studentName,
  indexNumber,
  tempPassword
}: SendApprovalCredentialsEmailOptions): Promise<{ success: boolean; simulated?: boolean }> => {
  const from = DEFAULT_FROM_ADDRESS;
  const transporter = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Twintec Official Credentials & Portal Access</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 36px 28px; text-align: center; border-bottom: 4px solid #10b981; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; }
        .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
        .content { padding: 40px 36px; }
        .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .subtitle { font-size: 13px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
        .description { font-size: 14.5px; line-height: 1.6; color: #334155; margin-bottom: 32px; }
        .cred-card { background: #0f172a; border-radius: 8px; padding: 28px; color: #ffffff; margin-bottom: 32px; box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
        .cred-card-header { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 20px; }
        .cred-group { margin-bottom: 20px; }
        .cred-group:last-child { margin-bottom: 0; }
        .cred-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .cred-val { font-size: 20px; font-weight: 800; color: #10b981; font-family: 'Courier New', Courier, monospace; letter-spacing: 1px; }
        .security-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 18px 20px; font-size: 13px; color: #854d0e; line-height: 1.6; margin-bottom: 28px; }
        .security-box-title { font-size: 12px; font-weight: 800; color: #a16207; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderHeaderCard()}
        <div class="content">
          <div class="subtitle">Official Admission Decision: Approved</div>
          <h2 class="title">Student Access Credentials</h2>
          <p class="description">
            Dear <strong>${studentName}</strong>,<br><br>
            Your application for course admission has been formally <strong>Approved</strong> by the Twintec Admissions Office. Below are your official institutional credentials for accessing the Student Learning Management System portal.
          </p>

          <div class="cred-card">
            <div class="cred-card-header">Official Student Portal Credentials</div>
            
            <div class="cred-group">
              <div class="cred-label">Registration Number (Index No):</div>
              <div class="cred-val">${indexNumber}</div>
            </div>

            <div class="cred-group">
              <div class="cred-label">Temporary Password:</div>
              <div class="cred-val">${tempPassword}</div>
            </div>

            <div class="cred-group">
              <div class="cred-label">Registered Student Email:</div>
              <div style="font-size: 15px; font-weight: 600; color: #ffffff;">${to}</div>
            </div>
          </div>

          <div class="security-box">
            <div class="security-box-title">Important Policy & Password Expiry Notice</div>
            Your temporary password is valid for <strong>7 days</strong>. Upon your initial login to the Twintec Student Portal, you will be required to establish a secure permanent password.
          </div>
        </div>
        <div class="footer">
          Twintec Vocational Training Institute &bull; Official Communication
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: `Twintec Application Approved - Registration No: ${indexNumber}`,
        text: `Dear ${studentName}, your Twintec course application has been approved. Registration Number: ${indexNumber}, Temporary Password: ${tempPassword}. Please log in to set your permanent password.`,
        html: htmlContent,
      });
      console.log(`[APPROVAL EMAIL SENT SUCCESSFULLY via SMTP] To: ${to}`);
      return { success: true };
    } catch (err: any) {
      console.warn(`[SMTP DISPATCH WARNING] Could not send approval email via SMTP (${err?.message || err}). Falling back to dev logger notice.`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`[DEV APPROVAL CREDENTIALS EMAIL NOTICE]`);
  console.log(`To: ${to}`);
  console.log(`Student: ${studentName}`);
  console.log(`Registration No: [ ${indexNumber} ]`);
  console.log(`Temporary Password: [ ${tempPassword} ]`);
  console.log(`======================================================\n`);
  return { success: true, simulated: true };
};

/**
 * Sends password reset link email.
 */
export const sendPasswordResetEmail = async ({ to, resetLink }: SendPasswordResetEmailOptions): Promise<{ success: boolean; simulated?: boolean }> => {
  const from = DEFAULT_FROM_ADDRESS;
  const transporter = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Twintec Password Reset</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 3px solid #ea580c; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; }
        .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
        .content { padding: 36px 32px; text-align: center; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 28px; }
        .btn-link { display: inline-block; background: #ea580c; color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-bottom: 24px; }
        .expiry-note { font-size: 13px; color: #64748b; margin-bottom: 24px; font-weight: 500; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderHeaderCard()}
        <div class="content">
          <h2 class="title">Password Reset Request</h2>
          <p class="description">
            You requested a password reset for your Twintec Student Portal account. Click the button below to establish a new password:
          </p>
          <a href="${resetLink}" class="btn-link" target="_blank">Reset Your Password</a>
          <p class="expiry-note">
            Password Reset Link Expiry: <strong>1 Hour</strong>
          </p>
        </div>
        <div class="footer">
          Twintec Vocational Training Institute &bull; Official Communication
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: `Twintec Password Reset Request`,
        text: `Click the following link to reset your Twintec password: ${resetLink}. It expires in 1 hour.`,
        html: htmlContent,
      });
      return { success: true };
    } catch (err: any) {
      console.warn(`[RESET EMAIL SMTP WARNING] (${err?.message || err}).`);
    }
  }

  return { success: true, simulated: true };
};

export interface SendApprovalMailOptions {
  to: string;
  name: string;
  registrationNumber: string;
  temporaryPassword: string;
}

/**
 * Sends an approval confirmation email with Registration Number and Temporary Password via Nodemailer.
 */
export const sendApprovalEmail = async ({
  to,
  name,
  registrationNumber,
  temporaryPassword,
}: SendApprovalMailOptions): Promise<{ success: boolean; simulated?: boolean }> => {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || `"TVTI Institute" <${process.env.SMTP_USER || 'admissions@tvti.edu'}>`;
  const transporter = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TVTI Application Approved</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1a1a1a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; }
        .header h1 { color: #f97316; margin: 0; font-size: 24px; letter-spacing: 0.5px; }
        .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid #a7f3d0; }
        .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .description { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .credentials-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0; }
        .credential-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .credential-row:last-child { border-bottom: none; }
        .label { font-size: 13px; font-weight: 600; color: #64748b; }
        .value { font-size: 15px; font-weight: 700; color: #0f172a; font-family: monospace; }
        .highlight { color: #ea580c; }
        .notice { font-size: 13px; line-height: 1.5; color: #b45309; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TVTI Institute</h1>
          <p>Application Approved</p>
        </div>
        <div class="content">
          <div class="badge">✓ APPLICATION APPROVED</div>
          <h2 class="title">Dear ${name},</h2>
          <p class="description">
            Congratulations!<br><br>
            Your TVTI application has been approved. Your official account details are provided below:
          </p>
          
          <div class="credentials-card">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 12px; letter-spacing: 0.5px;">Account Details</div>
            <div class="credential-row">
              <span class="label">Registration Number:</span>
              <span class="value highlight">${registrationNumber}</span>
            </div>
            <div class="credential-row">
              <span class="label">Temporary Password:</span>
              <span class="value">${temporaryPassword}</span>
            </div>
            <div class="credential-row">
              <span class="label">Registered Email:</span>
              <span class="value" style="font-family: inherit;">${to}</span>
            </div>
          </div>

          <p class="description">
            Please use these credentials to log in to the TVTI system.
          </p>

          <div class="notice">
            🔒 <strong>Security Notice:</strong> For security reasons, please change your temporary password after your first login.
          </div>

          <p class="description" style="margin-top: 24px;">
            Regards,<br>
            <strong>TVTI Institute</strong>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} TVTI - Technical & Vocational Training Institute. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `TVTI Institute\nApplication Approved\n\nDear ${name},\n\nCongratulations!\n\nYour TVTI application has been approved.\n\nYour account details are:\n\nRegistration Number:\n${registrationNumber}\n\nTemporary Password:\n${temporaryPassword}\n\nPlease use these credentials to log in to the TVTI system.\n\nFor security reasons, please change your temporary password after your first login.\n\nRegards,\nTVTI Institute`;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[DEV APPROVAL EMAIL NOTICE]`);
    console.log(`To: ${to} (${name})`);
    console.log(`Registration No: ${registrationNumber}`);
    console.log(`Temp Password: ${temporaryPassword}`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  await transporter.sendMail({
    from,
    to,
    subject: `TVTI Application Approved — Your Registration Number & Login Credentials`,
    text: textContent,
    html: htmlContent,
  });

  return { success: true };
};

