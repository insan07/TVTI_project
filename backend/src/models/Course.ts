import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  fee: number;
  duration_weeks: number;
  is_active: boolean;
  prerequisites?: string;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    fee: { type: Number, required: true },
    duration_weeks: { type: Number, required: true },
    is_active: { type: Boolean, default: true },
    prerequisites: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', courseSchema);
