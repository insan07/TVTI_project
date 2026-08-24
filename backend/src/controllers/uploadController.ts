import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import Video from '../models/Video';
import cloudinary from '../config/cloudinary';
import { sendNotification } from '../services/notificationService';
import { saveBufferToGridFS } from '../services/fileStorage';

const saveFileToDisk = (buffer: Buffer, originalName: string, subfolder: 'videos' | 'notes' | 'materials'): string => {
  const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const ext = path.extname(originalName) || '.pdf';
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${subfolder}/${filename}`;
};

// ─── Cloudinary stream upload helper ─────────────────────────────────────────

const streamUpload = (
  buffer: Buffer,
  resourceType: 'video' | 'raw' | 'image' | 'auto',
  folder: string,
  options: any = {}
) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder, ...options },
      (error, result) => {
        if (result) resolve(result);
        else reject(error || new Error('Cloudinary upload failed'));
      }
    );
    stream.end(buffer);
  });
};

const describeUploadError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as { message?: string; http_code?: number; name?: string; code?: string };
    const parts = [e.name, e.code, e.http_code ? `HTTP ${e.http_code}` : null, e.message].filter(Boolean);
    if (parts.length > 0) return parts.join(' - ');
  }
  return 'Unknown upload error';
};

// ─── POST /api/instructors/materials ─────────────────────────────────────────
// Accepts a PDF, DOC, or DOCX file (multipart field: "material")

export const uploadMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batch_id, topic, title, order_index } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const materialFile = files?.material?.[0];

    console.log('[uploadMaterial] received', {
      batch_id, topic, title, order_index,
      hasMaterialFile: Boolean(materialFile),
      materialMeta: materialFile
        ? { name: materialFile.originalname, mimetype: materialFile.mimetype, size: materialFile.size }
        : null,
    });

    // Validate required fields
    if (!batch_id || !topic || !title) {
      res.status(400).json({ message: 'batch_id, topic, and title are required.' });
      return;
    }

    if (!materialFile) {
      res.status(400).json({ message: 'Please select a material file (PDF, DOC, or DOCX).' });
      return;
    }

    if (!materialFile.buffer) {
      res.status(400).json({ message: 'Material file was not received correctly.' });
      return;
    }

    const originalName = materialFile.originalname || 'document.pdf';
    const file_id = await saveBufferToGridFS(
      materialFile.buffer,
      originalName,
      materialFile.mimetype || 'application/pdf'
    );
    const cloudinary_url = `/api/files/${file_id}`;

    const material = await Video.create({
      batch_id,
      instructor_id: (req as any).user._id,
      topic,
      title,
      cloudinary_url,
      file_id,
      content_type: 'material',
      order_index: Number(order_index) || 0,
    });

    // Send instant notification to enrolled students
    try {
      await sendNotification({
        title: 'New Study Material Available 📄',
        message: `New material "${title}" has been uploaded for ${topic}.`,
        role: 'student',
        batchId: batch_id,
        type: 'material',
        relatedId: material._id,
      });
    } catch (notifErr) {
      console.warn('Failed to send material notification:', notifErr);
    }

    res.status(201).json(material);
  } catch (error) {
    console.error('Material upload failed:', error);
    const message = error instanceof Error && error.message ? error.message : 'Material upload failed';
    res.status(500).json({ message });
  }
};
