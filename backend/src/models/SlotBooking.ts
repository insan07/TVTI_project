import mongoose, { Document, Schema } from 'mongoose';

export interface ISlotBooking extends Document {
  slot_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  status: 'confirmed' | 'cancellation_requested' | 'cancelled';
  booked_at: Date;
  cancellation_reason?: string;
}

const slotBookingSchema = new Schema<ISlotBooking>(
  {
    slot_id:    { type: Schema.Types.ObjectId, ref: 'PracticeSlot', required: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:     { type: String, enum: ['confirmed', 'cancellation_requested', 'cancelled'], default: 'confirmed' },
    booked_at:  { type: Date, default: Date.now },
    cancellation_reason: { type: String, default: '' },
  },
  { timestamps: true }
);

// One confirmed or pending cancellation booking per student per slot
slotBookingSchema.index(
  { slot_id: 1, student_id: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['confirmed', 'cancellation_requested'] } } }
);

export default mongoose.model<ISlotBooking>('SlotBooking', slotBookingSchema);
