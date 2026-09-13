import { Response } from 'express';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import Batch from '../models/Batch';
import bcrypt from 'bcryptjs';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/authMiddleware';

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let stats = {};
    let enrolled_courses: any[] = [];

    if (user.role === 'student') {
      const enrollments = await Enrollment.find({ student_id: user._id, status: 'active' })
        .populate({
          path: 'batch_id',
          select: 'name start_date end_date schedule_json course_id',
          populate: { path: 'course_id', select: 'title code fee duration_weeks' }
        })
        .lean();

      stats = { enrolled_batches_count: enrollments.length };
      enrolled_courses = enrollments.map((e: any) => {
        const course = e.batch_id?.course_id || {};
        return {
          _id: course._id || e._id,
          title: course.title || e.batch_id?.name || 'Enrolled Course',
          code: course.code || 'TVTI',
          course_fee: course.fee || 0,
          batch_name: e.batch_id?.name
        };
      });
    } else if (user.role === 'instructor') {
      const assigned_batches = await Batch.countDocuments({ instructor_ids: user._id });
      stats = { assigned_batches_count: assigned_batches };
    } else if (user.role === 'admin') {
      const total_users = await User.countDocuments();
      stats = { total_users_count: total_users };
    }

    res.json({ ...user.toObject(), stats, enrolled_courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;

    if (req.file) {
      const base64Data = req.file.buffer.toString('base64');
      const fileUri = `data:${req.file.mimetype};base64,${base64Data}`;
      const uploadResponse = await cloudinary.uploader.upload(fileUri, {
        folder: 'lms_profiles',
      });
      user.profile_photo = uploadResponse.secure_url;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profile_photo: updatedUser.profile_photo,
      role: updatedUser.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { push_token, token } = req.body;
    const finalToken = token || push_token;
    if (finalToken) {
      await User.findByIdAndUpdate(req.user._id, {
        expo_push_token: finalToken,
        fcm_token: finalToken,
      });
    }
    res.json({ message: 'Push token updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
