import { Request, Response } from 'express';
import Video from '../models/Video';
import Enrollment from '../models/Enrollment';
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

// ─── GET /api/instructors/batches/:batchId/topics ─────────────────────────────

export const getBatchTopics = async (req: Request, res: Response): Promise<void> => {
  try {
    const topics = await Video.find({ batch_id: req.params.batchId }).distinct('topic');
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/instructors/videos ─────────────────────────────────────────────

export const getMyVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const videos = await Video.find({
      instructor_id: (req as any).user._id,
      content_type: 'video',
    })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/instructors/materials ──────────────────────────────────────────

export const getMyMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const materials = await Video.find({
      instructor_id: (req as any).user._id,
      content_type: 'material',
    })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/instructors/videos ────────────────────────────────────────────
// Accepts: YouTube URL  OR  a video file (multipart field: "video")
// Optionally: a notes/PDF attachment (multipart field: "notes")

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batch_id, topic, title, order_index, youtube_url } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log('[uploadVideo] received', {
      batch_id, topic, title, order_index,
      hasYoutubeUrl: Boolean(youtube_url),
      hasVideoFile: Boolean(files?.video?.length),
      hasNotesFile: Boolean(files?.notes?.length),
    });

    // Validate required fields
    if (!batch_id || !topic || !title) {
      res.status(400).json({ message: 'batch_id, topic, and title are required.' });
      return;
    }

    if (!youtube_url && !files?.video?.length) {
      res.status(400).json({ message: 'Please provide either a YouTube URL or a video file.' });
      return;
    }

    let cloudinary_url: string;

    // ── Option A: YouTube URL ──────────────────────────────────────
    if (youtube_url) {
      cloudinary_url = youtube_url;
    } else {
      // ── Option B: Video file → upload to Cloudinary ───────────────
      const videoFile = files.video[0];
      if (!videoFile?.buffer) {
        res.status(400).json({ message: 'Video file was not received correctly.' });
        return;
      }
      try {
        const result: any = await streamUpload(videoFile.buffer, 'video', 'lms_videos', {
          access_control: [{ access_type: 'token' }],
        });
        cloudinary_url = result.secure_url;
      } catch (error) {
        console.error('[uploadVideo] Cloudinary video upload failed', {
          title, batch_id, topic,
          file: { name: videoFile.originalname, mimetype: videoFile.mimetype, size: videoFile.size },
          error: describeUploadError(error),
        });
        const base64Data = videoFile.buffer.toString('base64');
        const mime = videoFile.mimetype || 'video/mp4';
        cloudinary_url = `data:${mime};base64,${base64Data}`;
      }
    }

    // ── Optional: Notes/PDF attachment ────────────────────────────
    let notes_url: string | undefined;
    if (files?.notes?.length) {
      const notesFile = files.notes[0];
      if (!notesFile?.buffer) {
        res.status(400).json({ message: 'Notes file was not received correctly.' });
        return;
      }
      try {
        const result: any = await streamUpload(notesFile.buffer, 'raw', 'lms_notes');
        notes_url = result.secure_url;
      } catch (error) {
        console.error('[uploadVideo] Cloudinary notes upload failed', {
          title, batch_id, topic,
          file: { name: notesFile.originalname, mimetype: notesFile.mimetype, size: notesFile.size },
          error: describeUploadError(error),
        });
        const base64Data = notesFile.buffer.toString('base64');
        const mime = notesFile.mimetype || 'application/pdf';
        notes_url = `data:${mime};base64,${base64Data}`;
      }
    }

    const video = await Video.create({
      batch_id,
      instructor_id: (req as any).user._id,
      topic,
      title,
      cloudinary_url,
      notes_url,
      content_type: 'video',
      order_index: Number(order_index) || 0,
    });

    // Fetch enrolled students (for future notification use)
    const enrollments = await Enrollment.find({ batch_id, status: 'active' }).select('student_id');
    void enrollments; // reserved for push notifications

    res.status(201).json(video);
  } catch (error) {
    console.error('Video upload failed:', error);
    const message = error instanceof Error && error.message ? error.message : 'Video upload failed';
    res.status(500).json({ message });
  }
};

// ─── PUT /api/instructors/videos/:id ─────────────────────────────────────────

export const updateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, instructor_id: (req as any).user._id },
      req.body,
      { new: true }
    );
    if (!video) {
      res.status(404).json({ message: 'Video not found or access denied' });
      return;
    }
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/instructors/videos/:id ──────────────────────────────────────

export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await Video.findOneAndDelete({
      _id: req.params.id,
      instructor_id: (req as any).user._id,
    });
    if (!video) {
      res.status(404).json({ message: 'Video not found or access denied' });
      return;
    }
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
