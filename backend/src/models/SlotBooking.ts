import mongoose, { Document, Schema } from 'mongoose';

export interface ISlotBooking extends Document {
  slot_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  status: 'confirmed' | 'cancelled';
  booked_at: Date;
}

const slotBookingSchema = new Schema<ISlotBooking>(
  {
    slot_id:    { type: Schema.Types.ObjectId, ref: 'PracticeSlot', required: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:     { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    booked_at:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One confirmed booking per student per slot
slotBookingSchema.index(
  { slot_id: 1, student_id: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

export default mongoose.model<ISlotBooking>('SlotBooking', slotBookingSchema);
