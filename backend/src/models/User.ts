import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'instructor' | 'student';
  phone?: string;
  profile_photo?: string;
  is_active: boolean;
  nic?: string;
  desired_course?: string;
  expo_push_token?: string;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'instructor', 'student'], required: true },
    phone: { type: String },
    profile_photo: { type: String },
    is_active: { type: Boolean, default: true },
    nic: { type: String },
    desired_course: { type: String },
    expo_push_token: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
