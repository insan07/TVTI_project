import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  batch_id: mongoose.Types.ObjectId;
  topic: string;
  title: string;
  cloudinary_url: string; // Used for Cloudinary video or Youtube url
  notes_url?: string;
  order_index: number;
}

const videoSchema = new Schema<IVideo>(
  {
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    topic: { type: String, required: true },
    title: { type: String, required: true },
    cloudinary_url: { type: String, required: true },
    notes_url: { type: String },
    order_index: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IVideo>('Video', videoSchema);
