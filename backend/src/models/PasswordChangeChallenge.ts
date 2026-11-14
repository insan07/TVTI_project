import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  _id: { type: Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true },
  password_hash: { type: String, required: true },
  otp_hash: { type: String, required: true },
  expires_at: { type: Date, required: true },
  sent_at: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { versionKey: false });
schema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('PasswordChangeChallenge', schema);
