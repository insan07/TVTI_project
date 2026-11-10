import { Request, Response } from 'express';
import Video from '../models/Video';
import Enrollment from '../models/Enrollment';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/authMiddleware';
import { normalizeYouTubeUrl } from './videoController';
import { Types } from 'mongoose';
import StudentVideoActivity from '../models/StudentVideoActivity';
import { getRecentTheoryLessons, updateStudentVideoActivity } from '../services/studentVideoActivity';

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
    const videoId = req.params.videoId as string;
    const { video, forbidden } = await getAuthorizedVideo(req, videoId);
    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }
    if (forbidden) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    if (video.content_type !== 'video') {
      res.status(400).json({ message: 'This lesson is not a video' });
      return;
    }

    const rawUrl = video.cloudinary_url || '';
    if (!rawUrl) {
      res.status(404).json({ message: 'Video stream is unavailable' });
      return;
    }
    await updateStudentVideoActivity(req.user._id, video._id as Types.ObjectId, { last_accessed_at: new Date() })
      .catch(error => console.warn('Unable to save recent video access:', error));
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

export const setVideoPinned = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.videoId as string;
    if (!Types.ObjectId.isValid(videoId) || typeof req.body?.pinned !== 'boolean') {
      res.status(400).json({ message: 'A valid video and pinned status are required' });
      return;
    }
    const { video, forbidden } = await getAuthorizedVideo(req, videoId);
    if (!video || video.content_type !== 'video') {
      res.status(404).json({ message: 'Video not found' });
      return;
    }
    if (forbidden) {
      res.status(403).json({ message: 'Not enrolled in this batch' });
      return;
    }

    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map(enrollment => enrollment.batch_id).filter(Boolean);
    const activity = await StudentVideoActivity.findOne({ student_id: req.user._id, video_id: video._id });
    if (req.body.pinned && !activity?.pinned_at) {
      const recent = await getRecentTheoryLessons(req.user._id, batchIds);
      if (recent.filter(lesson => lesson.is_pinned).length >= 3) {
        res.status(409).json({ message: 'Unpin a video before pinning another. You can keep three videos pinned.' });
        return;
      }
    }
    await updateStudentVideoActivity(req.user._id, video._id as Types.ObjectId, {
      pinned_at: req.body.pinned ? activity?.pinned_at ?? new Date() : null,
    });
    res.json({ theory_lessons: await getRecentTheoryLessons(req.user._id, batchIds) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update pinned video' });
  }
};

export const downloadVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.videoId as string;
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
