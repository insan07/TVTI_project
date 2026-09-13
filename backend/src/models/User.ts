import mongoose, { Document, Schema } from 'mongoose';

export interface IUserGuardianInfo {
  name?: string;
  relationship?: string;
  phone?: string;
  occupation?: string;
}

export interface IUserEducationInfo {
  highest_level?: string;
  institute_name?: string;
  year_completed?: string;
  grade_level?: string;
  details?: string;
}

export interface IPaymentInfo {
  total_fee?: number;
  amount_paid?: number;
  payment_status?: string;
  payment_method?: string;
  payment_slip?: string;
  receipt_number?: string;
  last_updated?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'instructor' | 'student';
  phone?: string;
  profile_photo?: string;
  is_active: boolean;
  nic?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  guardian?: IUserGuardianInfo;
  educational_qualification?: IUserEducationInfo;
  payment_info?: IPaymentInfo;
  desired_course?: string;
  expo_push_token?: string;
  fcm_token?: string;
  index_number?: string;
  registration_number?: string;
  must_change_password?: boolean;
  temp_password_expires_at?: Date;
  password_set_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'instructor', 'student'], required: true },
    phone: { type: String },
    profile_photo: { type: String },
    is_active: { type: Boolean, default: true },
    nic: { type: String },
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
    payment_info: {
      total_fee: { type: Number, default: 0 },
      amount_paid: { type: Number, default: 0 },
      payment_status: { type: String, default: 'pending' },
      payment_method: { type: String, default: 'physical_pay' },
      payment_slip: { type: String },
      receipt_number: { type: String },
      last_updated: { type: Date, default: Date.now },
    },
    desired_course: { type: String },
    expo_push_token: { type: String },
    fcm_token: { type: String },
    index_number: { type: String, unique: true, sparse: true },
    registration_number: { type: String, unique: true, sparse: true },
    must_change_password: { type: Boolean, default: false },
    temp_password_expires_at: { type: Date },
    password_set_at: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
