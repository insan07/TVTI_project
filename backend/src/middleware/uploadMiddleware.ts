import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.mp4', '.avi', '.mkv', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/avi', 'video/x-matroska', 'video/x-msvideo',
    'image/png', 'image/jpeg', 'image/jpg'
  ];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_UPLOAD_BYTES,
  },
  fileFilter,
});
