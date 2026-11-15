import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import PasswordChangeChallenge from '../models/PasswordChangeChallenge';
import PasswordChangeVerification from '../models/PasswordChangeVerification';
import { withAccountCredentialLock } from './accountCredentialLock';
import { PracticalError } from './practicalScheduling';
import { sendPasswordChangeOtpEmail } from './emailService';

async function account(userId: any, firstLogin: boolean) {
  const user = await User.findById(userId);
  if (!user || !user.is_active) throw new PracticalError(404, 'Active account not found.');
  if (firstLogin) {
    if (!user.must_change_password) throw new PracticalError(400, 'Use Change Password from your profile.');
    if (user.temp_password_expires_at && user.temp_password_expires_at.getTime() <= Date.now()) throw new PracticalError(403, 'Temporary password expired. Contact the administrator.');
  } else if (user.must_change_password) {
    throw new PracticalError(403, 'Complete your first-login password change first.');
  }
  return user;
}

export async function requestPasswordChangeOtp(userId: any) {
  const initial = await User.findById(userId);
  if (!initial) throw new PracticalError(404, 'Account not found.');
  return withAccountCredentialLock(initial.email, async () => {
    const user = await account(userId, !!initial.must_change_password);
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
    await PasswordChangeVerification.deleteOne({ _id: userId });
    return { message: 'A verification code was sent to your registered email. It expires in 10 minutes.', expires_in: 600, resend_after: 60 };
  });
}

async function verifyChallenge(user: any, otp: unknown) {
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) throw new PracticalError(400, 'Enter the six-digit verification code from your email.');
  const challenge = await PasswordChangeChallenge.findOneAndUpdate({ _id: user._id, email: user.email,
    password_hash: user.password_hash, expires_at: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { new: true });
  if (!challenge) throw new PracticalError(400, 'Verification code expired or unavailable. Request a new code.');
  if (!await bcrypt.compare(otp, challenge.otp_hash)) throw new PracticalError(400, challenge.attempts >= 5 ? 'Too many incorrect attempts. Request a new code.' : 'Incorrect verification code.');
  return challenge;
}

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function verifyPasswordChange(userId: any, body: any) {
  const initial = await User.findById(userId);
  if (!initial) throw new PracticalError(404, 'Account not found.');
  return withAccountCredentialLock(initial.email, async () => {
    const user = await account(userId, false);
    if (body.method === 'password') {
      if (typeof body.currentPassword !== 'string' || !body.currentPassword || !await bcrypt.compare(body.currentPassword, user.password_hash)) {
        throw new PracticalError(400, 'Incorrect current password. Try again or verify with an email code.');
      }
    } else if (body.method === 'otp') {
      await verifyChallenge(user, body.otp);
    } else {
      throw new PracticalError(400, 'Verify your current password or email code first.');
    }
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await PasswordChangeVerification.findOneAndUpdate({ _id: userId }, { $set: {
      email: user.email, password_hash: user.password_hash, token_hash: hashToken(verificationToken),
      expires_at: new Date(Date.now() + 600000),
    } }, { upsert: true });
    await PasswordChangeChallenge.deleteOne({ _id: userId });
    return { verificationToken, expires_in: 600, message: 'Identity verified. Enter and confirm your new password.' };
  });
}

export async function changeAccountPassword(userId: any, body: any, firstLogin = false) {
  const { newPassword, confirmPassword, otp, verificationToken } = body;
  if (typeof newPassword !== 'string' || newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72) throw new PracticalError(400, 'Use a password between 6 and 72 bytes (at least 6 characters).');
  if (!firstLogin && newPassword !== confirmPassword) throw new PracticalError(400, 'New passwords do not match.');
  const initial = await User.findById(userId);
  if (!initial) throw new PracticalError(404, 'Account not found.');
  return withAccountCredentialLock(initial.email, async () => {
    const user = await account(userId, firstLogin);
    if (firstLogin) {
      await verifyChallenge(user, otp);
    } else {
      if (typeof verificationToken !== 'string' || !/^[a-f0-9]{64}$/.test(verificationToken)) throw new PracticalError(410, 'Verify your current password or email code first.');
      const verification = await PasswordChangeVerification.findOne({ _id: userId, email: user.email,
        password_hash: user.password_hash, token_hash: hashToken(verificationToken), expires_at: { $gt: new Date() } });
      if (!verification) throw new PracticalError(410, 'Password verification expired or unavailable. Please verify again.');
    }
    if (await bcrypt.compare(newPassword, user.password_hash)) throw new PracticalError(400, 'Choose a password different from your current password.');
    const updated = await User.findOneAndUpdate({ _id: userId, is_active: true, password_hash: user.password_hash, email: user.email }, {
      $set: { password_hash: await bcrypt.hash(newPassword, 10), must_change_password: false, password_set_at: new Date() },
      $inc: { session_version: 1 },
      $unset: { temp_password_expires_at: 1, passwordResetOtpHash: 1, passwordResetOtpExpiresAt: 1, passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1, passwordResetCredentialHash: 1, passwordResetOtpAttempts: 1, passwordResetOtpSentAt: 1 },
    }, { new: true });
    if (!updated) throw new PracticalError(409, 'Your account changed. Please verify again.');
    await PasswordChangeChallenge.deleteOne({ _id: userId });
    await PasswordChangeVerification.deleteOne({ _id: userId });
    return updated;
  });
}
