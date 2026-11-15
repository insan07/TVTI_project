import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

const storage = multer.memoryStorage();
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.mp4', '.mov', '.webm', '.avi', '.mkv', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-matroska', 'video/x-msvideo',
    'image/png', 'image/jpeg', 'image/jpg'
  ];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    const extensionsForMime: Record<string, string[]> = {
      'application/pdf': ['.pdf'], 'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'video/webm': ['.webm'],
      'video/avi': ['.avi'], 'video/x-msvideo': ['.avi'], 'video/x-matroska': ['.mkv'],
      'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/jpg': ['.jpg', '.jpeg'],
    };
    if (!extensionsForMime[file.mimetype]?.includes(ext)) { cb(new Error('File extension does not match its content type.')); return; }
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_UPLOAD_BYTES,
    files: 2, fields: 30, parts: 32,
  },
  fileFilter,
});

export const imageUpload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 11 },
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) { cb(new Error('Choose a PNG or JPEG image.')); return; }
    fileFilter(req, file, cb);
  },
});

export function validateUploadedImage(req: Request, res: Response, next: NextFunction): void {
  if (req.file) {
    const buffer = req.file.buffer;
    const valid = req.file.mimetype === 'image/png'
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (!valid) { res.status(400).json({ message: 'The uploaded file is not a valid PNG or JPEG image.' }); return; }
  }
  next();
}
