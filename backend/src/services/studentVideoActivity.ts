import { Types } from 'mongoose';
import StudentVideoActivity from '../models/StudentVideoActivity';
import Video from '../models/Video';

export async function updateStudentVideoActivity(
  studentId: Types.ObjectId,
  videoId: Types.ObjectId,
  changes: { last_accessed_at?: Date; pinned_at?: Date | null },
) {
  const filter = { student_id: studentId, video_id: videoId };
  try {
    await StudentVideoActivity.updateOne(filter, { $set: changes }, { upsert: true });
  } catch (error: any) {
    // Concurrent opens may create the same activity; retain the unique row.
    if (error?.code !== 11000) throw error;
    await StudentVideoActivity.updateOne(filter, { $set: changes });
  }
}

export async function getRecentTheoryLessons(studentId: Types.ObjectId, batchIds: Types.ObjectId[]) {
  if (batchIds.length === 0) return [];
  return StudentVideoActivity.aggregate([
    { $match: {
      student_id: studentId,
      $or: [{ last_accessed_at: { $ne: null } }, { pinned_at: { $ne: null } }],
    } },
    { $lookup: { from: Video.collection.name, localField: 'video_id', foreignField: '_id', as: 'video' } },
    { $unwind: '$video' },
    // Recheck enrollment and content type so removed or inaccessible videos disappear.
    { $match: { 'video.batch_id': { $in: batchIds }, 'video.content_type': 'video' } },
    { $addFields: { is_pinned: { $ne: [{ $ifNull: ['$pinned_at', null] }, null] } } },
    { $sort: { is_pinned: -1, pinned_at: -1, last_accessed_at: -1, _id: -1 } },
    { $limit: 3 },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$video', {
      is_pinned: '$is_pinned',
      pinned_at: '$pinned_at',
      last_accessed_at: '$last_accessed_at',
    }] } } },
  ]);
}
