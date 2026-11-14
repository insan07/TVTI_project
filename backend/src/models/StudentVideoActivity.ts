import mongoose, { Schema } from 'mongoose';

const studentVideoActivitySchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  video_id: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  last_accessed_at: { type: Date, default: null },
  pinned_at: { type: Date, default: null },
}, { timestamps: true });

studentVideoActivitySchema.index({ student_id: 1, video_id: 1 }, { unique: true });
studentVideoActivitySchema.index({ student_id: 1, pinned_at: -1, last_accessed_at: -1 });

export default mongoose.model('StudentVideoActivity', studentVideoActivitySchema);
