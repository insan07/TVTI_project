import { ClientSession } from 'mongoose';
import crypto from 'crypto';
import User from '../models/User';
import Application from '../models/Application';

export async function generateUniqueRegistrationNumber(session?: ClientSession): Promise<string> {
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric' });
  const prefix = `TVTI-${year}-`, regex = new RegExp(`^${prefix}(\\d+)$`);
  const [users, applications] = await Promise.all([
    User.find({ registration_number: regex }).select('registration_number').session(session || null),
    Application.find({ registration_number: regex }).select('registration_number').session(session || null),
  ]);
  const max = [...users, ...applications].reduce((value, item) => Math.max(value, Number(item.registration_number?.match(regex)?.[1]) || 0), 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

export async function generateUniqueIndexNumber(session?: ClientSession): Promise<string> {
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric' }).slice(-2);
  const prefix = `${year}T`, regex = new RegExp(`^${prefix}(\\d+)$`);
  const users = await User.find({ index_number: regex }).select('index_number').session(session || null);
  const max = users.reduce((value, item) => Math.max(value, Number(item.index_number?.match(regex)?.[1]) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export function generateTemporaryPassword(): string {
  return `TVTI@${crypto.randomBytes(12).toString('base64url')}`;
}
