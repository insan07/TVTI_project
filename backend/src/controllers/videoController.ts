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
          reject(error);
        }
      }
    );
    stream.end(buffer);
  });
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

    if (!youtube_url && files?.video) {
      const videoFile = files.video[0];
      const result: any = await streamUpload(videoFile.buffer, 'video', 'lms_videos', {
        access_control: [{ access_type: 'token' }]
      });
      cloudinary_url = result.secure_url;
    }

    if (files?.notes) {
      const notesFile = files.notes[0];
      const result: any = await streamUpload(notesFile.buffer, 'raw', 'lms_notes');
      notes_url = result.secure_url;
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
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
