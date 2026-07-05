import { Request, Response } from 'express';
import Video from '../models/Video';
import Enrollment from '../models/Enrollment';
import Batch from '../models/Batch';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/authMiddleware';

export const getEnrolledBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' })
      .populate({
        path: 'batch_id',
        populate: { path: 'course_id', select: 'title' }
      })
      .lean();
    res.json(enrollments.map(e => e.batch_id).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBatchVideos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    
    const enrollment = await Enrollment.findOne({ student_id: req.user._id, batch_id: batchId, status: 'active' });
    if (!enrollment) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    const videos = await Video.find({ batch_id: batchId }).sort({ order_index: 1 }).lean();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVideoStreamUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    const enrollment = await Enrollment.findOne({ student_id: req.user._id, batch_id: video.batch_id, status: 'active' });
    if (!enrollment) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    if (video.cloudinary_url.includes('youtube.com') || video.cloudinary_url.includes('youtu.be')) {
      res.json({ url: video.cloudinary_url, type: 'youtube' });
      return;
    }

    const urlParts = video.cloudinary_url.split('/upload/');
    let secureStreamUrl = video.cloudinary_url;
    if (urlParts.length === 2) {
      const publicIdWithExt = urlParts[1].split('/').slice(1).join('/');
      const publicId = publicIdWithExt.split('.')[0];
      secureStreamUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        sign_url: true,
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      });
    }

    res.json({ url: secureStreamUrl, type: 'cloudinary' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNotesUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    if (!video || !video.notes_url) {
      res.status(404).json({ message: 'Notes not found' });
      return;
    }

    const enrollment = await Enrollment.findOne({ student_id: req.user._id, batch_id: video.batch_id, status: 'active' });
    if (!enrollment) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    res.json({ url: video.notes_url });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
