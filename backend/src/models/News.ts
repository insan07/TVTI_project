import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  title: string;
  category: string; // 'ADMISSIONS' | 'GRADUATION' | 'FACILITIES' | 'NEWS'
  summary?: string;
  content: string;
  image_url?: string;
  published: boolean;
  posted_by: mongoose.Types.ObjectId;
}

const newsSchema = new Schema<INews>(
  {
    title: { type: String, required: true },
    category: { type: String, default: 'NEWS' },
    summary: { type: String },
    content: { type: String, required: true },
    image_url: { type: String },
    published: { type: Boolean, default: true },
    posted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<INews>('News', newsSchema);
