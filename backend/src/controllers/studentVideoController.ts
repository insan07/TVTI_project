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

    const videos = await Video.find({ batch_id: batchId, content_type: 'video' }).sort({ order_index: 1 }).lean();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBatchMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    
    const enrollment = await Enrollment.findOne({ student_id: req.user._id, batch_id: batchId, status: 'active' });
    if (!enrollment) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    const materials = await Video.find({ batch_id: batchId, content_type: 'material' }).sort({ order_index: 1 }).lean();
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

import { normalizeYouTubeUrl } from './videoController';

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

    const rawUrl = video.cloudinary_url || '';

    // Handle YouTube URLs
    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      const embedUrl = normalizeYouTubeUrl(rawUrl);
      res.json({
        url: embedUrl,
        rawUrl: rawUrl,
        type: 'youtube',
        title: video.title,
        topic: video.topic,
        notes_url: video.notes_url,
      });
      return;
    }

    // Handle Local disk uploaded files e.g. /uploads/videos/123.mp4
    let finalUrl = rawUrl;
    if (rawUrl.startsWith('/uploads/')) {
      const protocol = req.protocol;
      const host = req.get('host');
      finalUrl = `${protocol}://${host}${rawUrl}`;
    }

    res.json({
      url: finalUrl,
      type: 'cloudinary',
      title: video.title,
      topic: video.topic,
      notes_url: video.notes_url,
    });
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

    let notesUrl = video.notes_url;
    if (notesUrl.startsWith('/uploads/')) {
      const protocol = req.protocol;
      const host = req.get('host');
      notesUrl = `${protocol}://${host}${notesUrl}`;
    }

    res.json({ url: notesUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
