import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  batch_id: mongoose.Types.ObjectId;
  instructor_id: mongoose.Types.ObjectId;
  topic: string;
  title: string;
  cloudinary_url: string; // Used for Cloudinary video or Youtube url
  notes_url?: string;
  content_type: 'video' | 'material';
  order_index: number;
}

const videoSchema = new Schema<IVideo>(
  {
    batch_id:      { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    topic: { type: String, required: true },
    title: { type: String, required: true },
    cloudinary_url: { type: String, required: true },
    notes_url: { type: String },
    content_type: { type: String, enum: ['video', 'material'], default: 'video' },
    order_index: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IVideo>('Video', videoSchema);
