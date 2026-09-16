import mongoose, { Document, Schema } from 'mongoose';

export type ApplicationStatus = 'pending' | 'contacted' | 'paid' | 'approved' | 'rejected';
export type PaymentMethod = 'bank_transfer' | 'physical_pay';
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'waived';

export interface IGuardianInfo {
  name?: string;
  relationship?: string;
  phone?: string;
  occupation?: string;
}

export interface IEducationInfo {
  highest_level?: string;
  institute_name?: string;
  year_completed?: string;
  grade_level?: string;
  details?: string;
}

export interface IApplication extends Document {
  full_name: string;
  nic_number?: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  guardian?: IGuardianInfo;
  educational_qualification?: IEducationInfo;
  student_photo?: string;
  payment_method?: PaymentMethod;
  payment_slip?: string;
  total_course_fee?: number;
  amount_paid?: number;
  payment_status?: PaymentStatus;
  course_id: mongoose.Types.ObjectId;
  course_ids?: mongoose.Types.ObjectId[];
  status: ApplicationStatus;
  terms_accepted: boolean;
  terms_accepted_at: Date;
  submitted_at: Date;
  generated_index_number?: string;
  registration_number?: string;
  email_verified?: boolean;
  approval_email_sent?: boolean;
  approval_email_sent_at?: Date;
  approval_email_error?: string;
}

const applicationSchema = new Schema<IApplication>(
  {
    full_name: { type: String, required: true },
    nic_number: { type: String, required: false },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    date_of_birth: { type: String },
    gender: { type: String },
    address: { type: String },
    guardian: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      occupation: { type: String },
    },
    educational_qualification: {
      highest_level: { type: String },
      institute_name: { type: String },
      year_completed: { type: String },
      grade_level: { type: String },
      details: { type: String },
    },
    student_photo: { type: String },
    payment_method: { type: String, enum: ['bank_transfer', 'physical_pay'], default: 'physical_pay' },
    payment_slip: { type: String },
    total_course_fee: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    payment_status: { type: String, enum: ['pending', 'partially_paid', 'paid', 'waived'], default: 'pending' },
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
    generated_index_number: { type: String },
    registration_number: { type: String },
    email_verified: { type: Boolean, default: false },
    approval_email_sent: { type: Boolean, default: false },
    approval_email_sent_at: { type: Date },
    approval_email_error: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>('Application', applicationSchema);
