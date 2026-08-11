import mongoose, { Document, Schema } from 'mongoose';

export type ApplicationStatus = 'pending' | 'contacted' | 'paid' | 'approved' | 'rejected';

export interface IApplication extends Document {
  full_name: string;
  nic_number: string;
  email: string;
  phone: string;
  course_id: mongoose.Types.ObjectId;
  course_ids?: mongoose.Types.ObjectId[];
  status: ApplicationStatus;
  terms_accepted: boolean;
  terms_accepted_at: Date;
  submitted_at: Date;
  generated_index_number?: string;
}

const applicationSchema = new Schema<IApplication>(
  {
    full_name: { type: String, required: true },
    nic_number: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    course_ids: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    status: {
      type: String,
      enum: ['pending', 'contacted', 'paid', 'approved', 'rejected'],
      default: 'pending'
    },
    terms_accepted: { type: Boolean, required: true, default: true },
    terms_accepted_at: { type: Date, default: Date.now },
    submitted_at: { type: Date, default: Date.now },
    generated_index_number: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>('Application', applicationSchema);
