import crypto from 'crypto';
import mongoose, { Schema } from 'mongoose';
import { PracticalError } from './practicalScheduling';

const schema = new Schema({ _id: String, owner: String, expires_at: Date }, { versionKey: false });
schema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
const Dispatch = mongoose.model('AccountCredentialDispatch', schema);

/** One account operation includes issuance, commit and SMTP delivery, across API instances. */
export async function withAccountCredentialLock<T>(email: string, work: () => Promise<T>): Promise<T> {
  const key = String(email || '').trim().toLowerCase();
  if (!key) throw new PracticalError(400, 'A valid account email is required.');
  const owner = crypto.randomUUID();
  try {
    await Dispatch.findOneAndUpdate({ _id: key, expires_at: { $lte: new Date() } },
      { $set: { owner, expires_at: new Date(Date.now() + 5 * 60_000) } }, { upsert: true, new: true });
  } catch (error: any) {
    if (error.code === 11000) throw new PracticalError(409, 'Credentials are already being prepared or emailed for this account. Wait for that request to finish.');
    throw error;
  }
  try { return await work(); }
  finally {
    // A cleanup outage must not turn a committed account into a failed creation response.
    await Dispatch.deleteOne({ _id: key, owner }).catch(() => {});
  }
}
