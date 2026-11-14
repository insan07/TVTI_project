import mongoose from 'mongoose';
import Batch from '../models/Batch';

export async function assignedUploadBatch(user: any, batchId: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(batchId)) return false;
  return !!await Batch.exists({ _id: batchId, status: 'active', ...(user.role === 'admin' ? {} : { instructor_ids: user._id }) });
}
