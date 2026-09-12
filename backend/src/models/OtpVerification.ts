import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpVerification extends Document {
  email: string;
  otp_hash?: string;
  expires_at: Date;
  attempts: number;
  verified: boolean;
  verified_at?: Date;
  last_sent_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpVerificationSchema = new Schema<IOtpVerification>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp_hash: {
      type: String,
      default: '',
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: '2h' }, // Auto-clean records 2 hours after expiry
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verified_at: {
      type: Date,
    },
    last_sent_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IOtpVerification>('OtpVerification', otpVerificationSchema);
