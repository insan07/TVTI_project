import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import OtpVerification from '../models/OtpVerification';
import { sendOtpEmail } from './emailService';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

export interface OtpResult {
  success: boolean;
  message: string;
  verified?: boolean;
  cooldownRemaining?: number;
  devOtp?: string;
}

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generates a secure 6-digit numeric OTP
 */
export const generate6DigitOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Sends a 6-digit OTP to the given email address.
 * Enforces a 60-second resend cooldown and 10-minute expiry.
 */
export const sendOtp = async (rawEmail: string): Promise<OtpResult> => {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { success: false, message: 'A valid email address is required' };
  }

  const email = rawEmail.toLowerCase().trim();
  if (!isValidEmail(email)) {
    return { success: false, message: 'Please provide a valid email format' };
  }

  // Check for existing OTP record and enforce cooldown
  const existing = await OtpVerification.findOne({ email });
  if (existing && existing.last_sent_at) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(existing.last_sent_at).getTime()) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const remaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        message: `Please wait ${remaining} seconds before requesting a new code.`,
        cooldownRemaining: remaining,
      };
    }
  }

  // Generate OTP and hash it
  const otp = generate6DigitOtp();
  const salt = await bcrypt.genSalt(10);
  const otp_hash = await bcrypt.hash(otp, salt);
  const expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Upsert OTP record
  await OtpVerification.findOneAndUpdate(
    { email },
    {
      email,
      otp_hash,
      expires_at,
      attempts: 0,
      verified: false,
      verified_at: null,
      last_sent_at: new Date(),
    },
    { upsert: true, new: true }
  );

  // Send email via Nodemailer
  try {
    const mailResult = await sendOtpEmail({ to: email, otp });
    if (mailResult.simulated) {
      return {
        success: true,
        message: `OTP Code is [ ${otp} ]. (Note: Configure SMTP in backend/.env to deliver real emails to inbox)`,
        devOtp: otp,
      };
    }
  } catch (mailError: any) {
    console.error('Failed to send OTP email:', mailError);
    return { success: false, message: 'Unable to send OTP email. Please check your SMTP configuration.' };
  }

  return { success: true, message: 'OTP sent successfully to your email.' };
};

/**
 * Verifies the OTP provided by the user.
 */
export const verifyOtp = async (rawEmail: string, rawOtp: string): Promise<OtpResult> => {
  if (!rawEmail || !rawOtp) {
    return { success: false, message: 'Email and OTP are required' };
  }

  const email = rawEmail.toLowerCase().trim();
  const otp = String(rawOtp).trim();

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return { success: false, message: 'Invalid OTP. Please enter a 6-digit code.' };
  }

  const record = await OtpVerification.findOne({ email });

  if (!record) {
    return { success: false, message: 'No OTP request found for this email. Please request an OTP.' };
  }

  // Already verified?
  if (record.verified) {
    return { success: true, verified: true, message: 'Email already verified' };
  }

  // Exceeded maximum attempts?
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  // Expired?
  if (new Date() > new Date(record.expires_at)) {
    return { success: false, message: 'OTP has expired. Please request a new OTP.' };
  }

  // Check if hash exists
  if (!record.otp_hash) {
    return { success: false, message: 'Invalid OTP. Please request a new OTP.' };
  }

  const isMatch = await bcrypt.compare(otp, record.otp_hash);

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // Success: mark verified and invalidate the OTP hash
  record.verified = true;
  record.verified_at = new Date();
  record.otp_hash = ''; // Clear hash so it cannot be reused
  await record.save();

  return {
    success: true,
    verified: true,
    message: 'Email verified successfully',
  };
};

/**
 * Verifies whether the email address has an active, valid verification record.
 * Must be verified within the last 2 hours.
 */
export const isEmailVerified = async (rawEmail: string): Promise<boolean> => {
  if (!rawEmail) return false;
  const email = rawEmail.toLowerCase().trim();
  const record = await OtpVerification.findOne({ email, verified: true });
  if (!record || !record.verified_at) return false;

  // Ensure verification occurred within 2 hours
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  return new Date(record.verified_at).getTime() > twoHoursAgo;
};

/**
 * Consumes the verification record after application submission so it cannot be used again.
 */
export const consumeEmailVerification = async (rawEmail: string): Promise<void> => {
  if (!rawEmail) return;
  const email = rawEmail.toLowerCase().trim();
  await OtpVerification.deleteOne({ email });
};
