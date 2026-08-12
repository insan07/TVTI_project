import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type?: string;
  is_read: boolean;
  related_id?: mongoose.Types.ObjectId;
  link?: string;
}

const notificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String },
    is_read: { type: Boolean, default: false },
    related_id: { type: Schema.Types.ObjectId },
    link: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', notificationSchema);
