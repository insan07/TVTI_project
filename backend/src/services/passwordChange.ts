import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import PasswordChangeChallenge from '../models/PasswordChangeChallenge';
import { withAccountCredentialLock } from './accountCredentialLock';
import { PracticalError } from './practicalScheduling';
import { sendPasswordChangeOtpEmail } from './emailService';

async function account(userId: any, currentPassword: unknown, firstLogin: boolean) {
  const user = await User.findById(userId);
  if (!user || !user.is_active) throw new PracticalError(404, 'Active account not found.');
  if (firstLogin) {
    if (!user.must_change_password) throw new PracticalError(400, 'Use Change Password from your profile.');
    if (user.temp_password_expires_at && user.temp_password_expires_at.getTime() <= Date.now()) throw new PracticalError(403, 'Temporary password expired. Contact the administrator.');
  } else if (typeof currentPassword !== 'string' || !await bcrypt.compare(currentPassword, user.password_hash)) {
    throw new PracticalError(400, 'Incorrect current password.');
  }
  return user;
}

export async function requestPasswordChangeOtp(userId: any, currentPassword: unknown) {
  const initial = await User.findById(userId);
  if (!initial) throw new PracticalError(404, 'Account not found.');
  return withAccountCredentialLock(initial.email, async () => {
    const user = await account(userId, currentPassword, !!initial.must_change_password);
    const previous = await PasswordChangeChallenge.findById(userId);
    if (previous && previous.sent_at.getTime() + 60000 > Date.now()) throw new PracticalError(429, 'Please wait 60 seconds before requesting another code.');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otp_hash = await bcrypt.hash(otp, 10);
    // A failed email must not invalidate a code already delivered or claim success.
    const delivered = await sendPasswordChangeOtpEmail({ to: user.email, otp });
    if (!delivered.success) throw new PracticalError(503, 'Verification email could not be delivered. Please try again.');
    const sent_at = new Date();
    await PasswordChangeChallenge.findOneAndUpdate({ _id: userId }, { $set: {
      email: user.email, password_hash: user.password_hash, otp_hash, sent_at,
      expires_at: new Date(sent_at.getTime() + 600000), attempts: 0,
    } }, { upsert: true });
    return { message: 'A verification code was sent to your registered email. It expires in 10 minutes.', expires_in: 600, resend_after: 60 };
  });
}

export async function changeAccountPassword(userId: any, body: any, firstLogin = false) {
  const { currentPassword, newPassword, otp } = body;
  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 72) throw new PracticalError(400, 'Use a password between 6 and 72 characters.');
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) throw new PracticalError(400, 'Enter the six-digit verification code from your email.');
  const initial = await User.findById(userId);
  if (!initial) throw new PracticalError(404, 'Account not found.');
  return withAccountCredentialLock(initial.email, async () => {
    const user = await account(userId, currentPassword, firstLogin);
    if (await bcrypt.compare(newPassword, user.password_hash)) throw new PracticalError(400, 'Choose a password different from your current password.');
    const challenge = await PasswordChangeChallenge.findOneAndUpdate({ _id: userId, email: user.email,
      password_hash: user.password_hash, expires_at: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { new: true });
    if (!challenge) throw new PracticalError(400, 'Verification code expired or unavailable. Request a new code.');
    if (!await bcrypt.compare(otp, challenge.otp_hash)) throw new PracticalError(400, challenge.attempts >= 5 ? 'Too many incorrect attempts. Request a new code.' : 'Incorrect verification code.');
    const updated = await User.findOneAndUpdate({ _id: userId, password_hash: challenge.password_hash, email: challenge.email }, {
      $set: { password_hash: await bcrypt.hash(newPassword, 10), must_change_password: false, password_set_at: new Date() },
      $unset: { temp_password_expires_at: 1, passwordResetOtpHash: 1, passwordResetOtpExpiresAt: 1, passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1 },
    }, { new: true });
    if (!updated) throw new PracticalError(409, 'Your account changed. Request a new verification code.');
    await PasswordChangeChallenge.deleteOne({ _id: userId, otp_hash: challenge.otp_hash });
    return updated;
  });
}
