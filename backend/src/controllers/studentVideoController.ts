import { Request, Response } from 'express';
import Video from '../models/Video';
import Enrollment from '../models/Enrollment';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/authMiddleware';
import { normalizeYouTubeUrl } from './videoController';

export const getEnrolledBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' })
      .populate({
        path: 'batch_id',
        populate: [
          { path: 'course_id', select: 'title' },
          { path: 'instructor_ids', select: 'name' }
        ]
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

const getAuthorizedVideo = async (req: AuthRequest, videoId: string) => {
  const video = await Video.findById(videoId);
  if (!video) return { video: null, forbidden: false };

  const enrollment = await Enrollment.findOne({
    student_id: req.user._id,
    batch_id: video.batch_id,
    status: 'active',
  });

  return { video, forbidden: !enrollment };
};

export const getVideoStreamUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const { video, forbidden } = await getAuthorizedVideo(req, videoId);
    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }
    if (forbidden) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    const rawUrl = video.cloudinary_url || '';
    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      res.json({
        url: normalizeYouTubeUrl(rawUrl),
        rawUrl,
        type: 'youtube',
        downloadable: false,
        title: video.title,
        topic: video.topic,
        notes_url: video.notes_url,
      });
      return;
    }

    let finalUrl = rawUrl;
    if (rawUrl.startsWith('/uploads/')) {
      finalUrl = `${req.protocol}://${req.get('host')}${rawUrl}`;
    }

    res.json({
      url: finalUrl,
      downloadUrl: `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}download=1`,
      type: 'video',
      downloadable: true,
      title: video.title,
      topic: video.topic,
      notes_url: video.notes_url,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const { video, forbidden } = await getAuthorizedVideo(req, videoId);
    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }
    if (forbidden) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    const rawUrl = video.cloudinary_url || '';
    if (!rawUrl || rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      res.status(400).json({ message: 'This video is streamed from YouTube and cannot be downloaded.' });
      return;
    }

    if (rawUrl.startsWith('/uploads/')) {
      res.redirect(`${req.protocol}://${req.get('host')}${rawUrl}?download=1`);
      return;
    }

    // Cloudinary supports attachment delivery by adding fl_attachment to the URL.
    const downloadUrl = rawUrl.replace('/upload/', '/upload/fl_attachment/');
    res.redirect(downloadUrl);
  } catch (error) {
    res.status(500).json({ message: 'Unable to download video' });
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
      notesUrl = `${req.protocol}://${req.get('host')}${notesUrl}`;
    }

    res.json({ url: notesUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
