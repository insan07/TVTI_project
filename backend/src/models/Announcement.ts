import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  batch_id: mongoose.Types.ObjectId;
  posted_by: mongoose.Types.ObjectId;
  title: string;
  message: string;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    posted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
