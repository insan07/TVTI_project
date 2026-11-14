import { ClientSession } from 'mongoose';
import crypto from 'crypto';
import User from '../models/User';
import Application from '../models/Application';
import AccountSequence from '../models/AccountSequence';

async function nextSequence(key: string, minimum: number, session?: ClientSession) {
  // Keep the high-water mark after deletions, and advance past imported legacy IDs.
  await AccountSequence.updateOne({ _id: key }, { $max: { value: minimum } }, { upsert: true, session });
  const counter = await AccountSequence.findOneAndUpdate({ _id: key }, { $inc: { value: 1 } }, { new: true, session });
  return counter!.value;
}

export async function generateUniqueRegistrationNumber(session?: ClientSession, at = new Date()): Promise<string> {
  const year = at.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric' }).slice(-2);
  const prefix = `${year}T`, regex = new RegExp(`^${prefix}(\\d+)$`);
  const [users, applications] = await Promise.all([
    User.find({ $or: [{ registration_number: regex }, { index_number: regex }] })
      .select('registration_number index_number').session(session || null),
    Application.find({ $or: [{ registration_number: regex }, { generated_index_number: regex }] })
      .select('registration_number generated_index_number').session(session || null),
  ]);
  const suffix = (value?: string) => Number(value?.match(regex)?.[1]) || 0;
  const userMax = users.reduce((max, user) => Math.max(max, suffix(user.registration_number), suffix(user.index_number)), 0);
  const max = applications.reduce((max, application) => Math.max(max, suffix(application.registration_number), suffix(application.generated_index_number)), userMax);
  // Reuse the old YYT index counter so previously allocated numbers are not reissued.
  return `${prefix}${String(await nextSequence(`student-index:${year}`, max, session)).padStart(4, '0')}`;
}

export async function generateUniqueIndexNumber(session?: ClientSession, at = new Date()): Promise<string> {
  return generateUniqueRegistrationNumber(session, at);
}

type StudentIdentity = { registration_number?: string; index_number?: string };
type ApplicationIdentity = { registration_number?: string; generated_index_number?: string };

/** Allocate once for new students, while retaining identifiers already issued. */
export async function resolveStudentIdentifiers(student?: StudentIdentity | null, application?: ApplicationIdentity | null, session?: ClientSession) {
  const studentNumber = (value?: string) => /^\d{2}T\d+$/.test(value || '') ? value : undefined;
  const registration_number = student?.registration_number || application?.registration_number ||
    studentNumber(student?.index_number) || studentNumber(application?.generated_index_number) || await generateUniqueRegistrationNumber(session);
  const index_number = student?.index_number || application?.generated_index_number ||
    studentNumber(registration_number) || await generateUniqueIndexNumber(session);
  return { registration_number, index_number };
}

export async function generateUniqueInstructorNumber(session?: ClientSession): Promise<string> {
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric' }).slice(-2);
  const prefix = `${year}I`, regex = new RegExp(`^${prefix}(\\d+)$`);
  const users = await User.find({ $or: [{ index_number: regex }, { registration_number: regex }] })
    .select('index_number registration_number').session(session || null);
  const max = users.reduce((highest, user) => Math.max(highest,
    Number(user.index_number?.match(regex)?.[1]) || 0, Number(user.registration_number?.match(regex)?.[1]) || 0), 0);
  return `${prefix}${String(await nextSequence(`instructor:${year}`, max, session)).padStart(4, '0')}`;
}

export function generateTemporaryPassword(): string {
  return `TVTI@${crypto.randomBytes(12).toString('base64url')}`;
}
