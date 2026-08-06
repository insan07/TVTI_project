import { Request, Response } from 'express';
import Video from '../models/Video';
import cloudinary from '../config/cloudinary';

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

    // Upload to Cloudinary
    let cloudinary_url: string;
    try {
      const originalName = materialFile.originalname || 'document.pdf';
      const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const result: any = await streamUpload(materialFile.buffer, 'raw', 'lms_materials', {
        public_id: `${Date.now()}_${cleanName}`,
        resource_type: 'raw',
      });
      cloudinary_url = result.secure_url;
    } catch (error) {
      console.error('[uploadMaterial] Cloudinary upload failed', {
        title, batch_id, topic,
        file: { name: materialFile.originalname, mimetype: materialFile.mimetype, size: materialFile.size },
        error: describeUploadError(error),
      });
      // Fallback: If Cloudinary fails or is unconfigured, create a Data URI fallback so upload still succeeds
      const base64Data = materialFile.buffer.toString('base64');
      const mime = materialFile.mimetype || 'application/pdf';
      cloudinary_url = `data:${mime};base64,${base64Data}`;
      console.log('[uploadMaterial] Using Data URI fallback for material');
    }

    const material = await Video.create({
      batch_id,
      instructor_id: (req as any).user._id,
      topic,
      title,
      cloudinary_url,
      content_type: 'material',
      order_index: Number(order_index) || 0,
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Material upload failed:', error);
    const message = error instanceof Error && error.message ? error.message : 'Material upload failed';
    res.status(500).json({ message });
  }
};
