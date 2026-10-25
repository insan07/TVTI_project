import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  student_id: mongoose.Types.ObjectId;
  batch_id: mongoose.Types.ObjectId;
  enrolled_date: Date;
  status: 'active' | 'completed' | 'dropped';
  batch_assignment_email_sent?: boolean;
  batch_assignment_email_sent_at?: Date;
  batch_assignment_email_error?: string;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    enrolled_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
    batch_assignment_email_sent: { type: Boolean, default: false },
    batch_assignment_email_sent_at: { type: Date },
    batch_assignment_email_error: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
