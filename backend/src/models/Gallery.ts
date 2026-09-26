import mongoose, { Document, Schema } from 'mongoose';

export interface IGalleryItem extends Document {
  title: string;
  category: string; // 'Workshops & Labs' | 'Practical Sessions' | 'Certificates & Events' | 'General'
  type: 'photo' | 'video'; // 'photo' or 'video'
  url: string;
  description?: string;
  youtubeId?: string;
  posted_by?: mongoose.Types.ObjectId;
}

const gallerySchema = new Schema<IGalleryItem>(
  {
    title: { type: String, required: true },
    category: { type: String, default: 'Workshops & Labs' },
    type: { type: String, enum: ['photo', 'video'], required: true, default: 'photo' },
    url: { type: String, required: true },
    description: { type: String },
    youtubeId: { type: String },
    posted_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IGalleryItem>('Gallery', gallerySchema);
