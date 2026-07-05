import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  student_id: mongoose.Types.ObjectId;
  batch_id: mongoose.Types.ObjectId;
  enrolled_date: Date;
  status: 'active' | 'completed' | 'dropped';
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    enrolled_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
