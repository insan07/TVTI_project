import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  batch_id?: mongoose.Types.ObjectId;
  posted_by: mongoose.Types.ObjectId;
  title: string;
  message: string;
  category?: string;
  image_url?: string;
  summary?: string;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: false },
    posted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, default: 'ADMISSIONS' },
    image_url: { type: String },
    summary: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
