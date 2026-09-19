import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethodType = 'bank_transfer' | 'online_transfer' | 'physical_cash' | 'other';
export type PaymentSlipStatusType = 'pending' | 'verified' | 'rejected';

export interface IPaymentSlip extends Document {
  student_id: mongoose.Types.ObjectId;
  application_id?: mongoose.Types.ObjectId;
  amount: number;
  payment_method: PaymentMethodType;
  slip_url?: string;
  status: PaymentSlipStatusType;
  rejection_reason?: string;
  notes?: string;
  verified_by?: mongoose.Types.ObjectId;
  verified_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSlipSchema = new Schema<IPaymentSlip>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    application_id: { type: Schema.Types.ObjectId, ref: 'Application' },
    amount: { type: Number, required: true, default: 0 },
    payment_method: {
      type: String,
      enum: ['bank_transfer', 'online_transfer', 'physical_cash', 'other'],
      default: 'bank_transfer',
    },
    slip_url: { type: String },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejection_reason: { type: String },
    notes: { type: String },
    verified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    verified_at: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IPaymentSlip>('PaymentSlip', paymentSlipSchema);
