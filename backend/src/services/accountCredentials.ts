import bcrypt from 'bcryptjs';
import { ClientSession } from 'mongoose';
import User from '../models/User';
import Application from '../models/Application';
import { practicalMutation, PracticalError } from './practicalScheduling';
import { generateTemporaryPassword, generateUniqueInstructorNumber, resolveStudentIdentifiers } from '../utils/admissionIdentifiers';

export async function ensureAccountIdentifiers(user: any, session: ClientSession) {
  if (user.role === 'instructor') {
    // Preserve old login aliases; the official number always uses the instructor series.
    user.registration_number ||= /^\d{2}I\d+$/.test(user.index_number || '') ? user.index_number : await generateUniqueInstructorNumber(session);
    user.index_number ||= user.registration_number;
  } else {
    const application = !user.registration_number
      ? await Application.findOne({ email: user.email, status: 'approved' }).sort({ createdAt: -1 }).session(session) : null;
    Object.assign(user, await resolveStudentIdentifiers(user, application, session));
  }
}

export function accountCredentials(user: any, password: string) {
  return { user_id: user._id, student_id: user.role === 'student' ? user._id : undefined, role: user.role,
    registration_number: user.registration_number, index_number: user.index_number, temp_password: password,
    email: user.email, expires_at: user.temp_password_expires_at };
}

export async function createInstructorAccount(body: any) {
  const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase();
  const nic = String(body.nic || '').trim(), phone = String(body.phone || '').trim();
  if (!name || !nic || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PracticalError(400, 'Name, valid email and NIC are required.');
  const password = generateTemporaryPassword(), hash = await bcrypt.hash(password, 10);
  return practicalMutation(async session => {
    if (await User.exists({ $or: [{ email }, { nic }] }).session(session)) throw new PracticalError(409, 'An account with this email or NIC already exists.');
    const number = await generateUniqueInstructorNumber(session);
    const [user] = await User.create([{ name, email, nic, phone, role: 'instructor', status: 'active', is_active: true,
      index_number: number, registration_number: number, password_hash: hash, must_change_password: true,
      temp_password_expires_at: new Date(Date.now() + 7 * 86400000) }], { session });
    return { user, credentials: accountCredentials(user, password) };
  });
}

/** All admin reset entry points share these identifiers, entropy and expiry rules. */
export async function regenerateAccountCredentials(userId: string) {
  const password = generateTemporaryPassword(), hash = await bcrypt.hash(password, 10);
  return practicalMutation(async session => {
    const user = await User.findById(userId).session(session);
    if (!user || !['student', 'instructor'].includes(user.role)) throw new PracticalError(404, 'Student or instructor account not found.');
    await ensureAccountIdentifiers(user, session);
    user.password_hash = hash; user.must_change_password = true;
    user.temp_password_expires_at = new Date(Date.now() + 7 * 86400000);
    user.passwordResetOtpHash = undefined; user.passwordResetOtpExpiresAt = undefined;
    user.passwordResetTokenHash = undefined; user.passwordResetTokenExpiresAt = undefined;
    await user.save({ session });
    if (user.role === 'student') await Application.updateMany({ email: user.email, status: 'approved' },
      { $set: { registration_number: user.registration_number, generated_index_number: user.index_number } }, { session });
    return { user, credentials: accountCredentials(user, password) };
  });
}
