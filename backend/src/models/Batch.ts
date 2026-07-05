import mongoose, { Document, Schema } from 'mongoose';

export interface IBatch extends Document {
  name: string;
  course_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  schedule_json: any;
  capacity: number;
  instructor_ids: mongoose.Types.ObjectId[];
  status: 'active' | 'completed' | 'cancelled';
}

const batchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    schedule_json: { type: Schema.Types.Mixed },
    capacity: { type: Number, required: true },
    instructor_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
  },
  { timestamps: true }
);

export default mongoose.model<IBatch>('Batch', batchSchema);
