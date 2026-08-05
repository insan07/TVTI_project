import { Request, Response } from 'express';
import Video from '../models/Video';
import Enrollment from '../models/Enrollment';
import cloudinary from '../config/cloudinary';
// import { sendBatchNotification } from '../services/NotificationService';

const streamUpload = (buffer: Buffer, resourceType: 'video' | 'raw' | 'image' | 'auto', folder: string, options: any = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder, ...options },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error || new Error('Cloudinary upload failed'));
        }
      }
    );
    stream.end(buffer);
  });
};

const describeUploadError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const cloudinaryError = error as { message?: string; http_code?: number; name?: string; code?: string };
    const parts = [
      cloudinaryError.name,
      cloudinaryError.code,
      cloudinaryError.http_code ? `HTTP ${cloudinaryError.http_code}` : null,
      cloudinaryError.message,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' - ');
    }
  }

  return 'Unknown upload error';
};

export const getBatchTopics = async (req: Request, res: Response): Promise<void> => {
  try {
    const videos = await Video.find({ batch_id: req.params.batchId }).distinct('topic');
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const videos = await Video.find({ instructor_id: (req as any).user._id })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batch_id, topic, title, order_index, youtube_url } = req.body;
    let cloudinary_url = youtube_url;
    let notes_url;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    console.log('[uploadVideo] request received', {
      batch_id,
      topic,
      title,
      order_index,
      hasYoutubeUrl: Boolean(youtube_url),
      hasVideoFile: Boolean(files?.video?.length),
      hasNotesFile: Boolean(files?.notes?.length),
      videoMeta: files?.video?.[0]
        ? {
            name: files.video[0].originalname,
            mimetype: files.video[0].mimetype,
            size: files.video[0].size,
          }
        : null,
      notesMeta: files?.notes?.[0]
        ? {
            name: files.notes[0].originalname,
            mimetype: files.notes[0].mimetype,
            size: files.notes[0].size,
          }
        : null,
    });

    if (!batch_id || !topic || !title) {
      res.status(400).json({ message: 'batch_id, topic, and title are required.' });
      return;
    }

    if (!youtube_url && files?.video?.length) {
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
          title,
          batch_id,
          topic,
          file: {
            originalname: videoFile.originalname,
            mimetype: videoFile.mimetype,
            size: videoFile.size,
          },
          error: describeUploadError(error),
        });
        throw error;
      }
    }

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
          title,
          batch_id,
          topic,
          file: {
            originalname: notesFile.originalname,
            mimetype: notesFile.mimetype,
            size: notesFile.size,
          },
          error: describeUploadError(error),
        });
        throw error;
      }
    }

    if (!cloudinary_url) {
      res.status(400).json({ message: 'Please provide either a video file or a YouTube URL.' });
      return;
    }

    const video = await Video.create({
      batch_id,
      topic,
      title,
      instructor_id: (req as any).user._id,
      cloudinary_url,
      notes_url,
      order_index: Number(order_index) || 0
    });

    // Notify students
    const enrollments = await Enrollment.find({ batch_id, status: 'active' }).select('student_id');
    const studentIds = enrollments.map(e => e.student_id.toString());
    
    /*
    if (studentIds.length > 0) {
      await sendBatchNotification(
        studentIds,
        'New Video Uploaded',
        `${title} was just added to your course under ${topic}.`,
        'new_video',
        { batchId: batch_id }
      );
    }
    */

    res.status(201).json(video);
  } catch (error) {
    console.error('Video upload failed:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Video upload failed';
    res.status(500).json({ message });
  }
};

export const updateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
