import multer from 'multer';

const storage = multer.memoryStorage();
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_UPLOAD_BYTES,
  },
});
