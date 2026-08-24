import mongoose from 'mongoose';

const getBucket = (): mongoose.mongo.GridFSBucket => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB is not connected');
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
};

export const saveBufferToGridFS = (buffer: Buffer, filename: string, contentType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, {
      metadata: { contentType },
    });

    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve(uploadStream.id.toString()));
    uploadStream.end(buffer);
  });
};

export const getGridFSDownloadStream = (fileId: string) => {
  if (!mongoose.isValidObjectId(fileId)) {
    throw new Error('Invalid file ID');
  }
  return getBucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

export const deleteGridFSFile = (fileId?: string): Promise<void> => {
  if (!fileId || !mongoose.isValidObjectId(fileId)) return Promise.resolve();
  return getBucket().delete(new mongoose.Types.ObjectId(fileId));
};