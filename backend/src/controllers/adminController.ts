import { Request, Response } from 'express';
import User from '../models/User';
import Course from '../models/Course';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import Result from '../models/Result';
import Video from '../models/Video';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import Application from '../models/Application';
import Announcement from '../models/Announcement';
import bcrypt from 'bcryptjs';
import { generateUniqueIndexNumber } from './applicationController';
import { sendApprovalCredentialsEmail } from '../services/emailService';

const formatTimeAgo = (date: any): string => {
  if (!date) return 'Recently';
  const now = new Date();
  const past = new Date(date);
  const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const fetchSystemActivities = async (limit = 20) => {
  try {
    const [users, announcements, courses, batches, applications, slotBookings, videos] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(limit).select('name role is_active createdAt'),
      Announcement.find().sort({ createdAt: -1 }).limit(limit).select('title createdAt'),
      Course.find().sort({ createdAt: -1 }).limit(limit).select('title createdAt'),
      Batch.find().populate('course_id', 'title').sort({ createdAt: -1 }).limit(limit).select('name course_id createdAt'),
      Application.find().populate('course_id', 'title').sort({ createdAt: -1 }).limit(limit).select('fullName course_id status createdAt'),
      SlotBooking.find().populate('student_id', 'name').sort({ createdAt: -1 }).limit(limit).select('student_id booking_date status createdAt'),
      Video.find().sort({ createdAt: -1 }).limit(limit).select('title content_type createdAt')
    ]);

    const items: Array<{
      id: string;
      text: string;
      type: string;
      createdAt: Date;
      time: string;
      color: string;
      icon: string;
    }> = [];

    users.forEach((u: any) => {
      const isStudent = u.role === 'student';
      items.push({
        id: `user-${u._id}`,
        text: isStudent
          ? `Student "${u.name}" registered ${u.is_active ? '(Active)' : '(Pending approval)'}`
          : `${u.role === 'instructor' ? 'Instructor' : 'User'} "${u.name}" account created`,
        type: 'user',
        createdAt: u.createdAt || new Date(),
        time: formatTimeAgo(u.createdAt),
        color: isStudent ? (u.is_active ? '#10B981' : '#F59E0B') : '#3B82F6',
        icon: isStudent ? 'person-add-outline' : 'shield-checkmark-outline'
      });
    });

    announcements.forEach((a: any) => {
      items.push({
        id: `ann-${a._id}`,
        text: `Notice posted: "${a.title}"`,
        type: 'announcement',
        createdAt: a.createdAt || new Date(),
        time: formatTimeAgo(a.createdAt),
        color: '#D97706',
        icon: 'megaphone-outline'
      });
    });

    courses.forEach((c: any) => {
      items.push({
        id: `course-${c._id}`,
        text: `Course "${c.title}" added to curriculum`,
        type: 'course',
        createdAt: c.createdAt || new Date(),
        time: formatTimeAgo(c.createdAt),
        color: '#8B5CF6',
        icon: 'book-outline'
      });
    });

    batches.forEach((b: any) => {
      items.push({
        id: `batch-${b._id}`,
        text: `New batch "${b.name}" opened for ${b.course_id?.title || 'course'}`,
        type: 'batch',
        createdAt: b.createdAt || new Date(),
        time: formatTimeAgo(b.createdAt),
        color: '#06B6D4',
        icon: 'layers-outline'
      });
    });

    applications.forEach((app: any) => {
      items.push({
        id: `app-${app._id}`,
        text: `Application received from ${app.fullName} for ${app.course_id?.title || 'course'}`,
        type: 'application',
        createdAt: app.createdAt || new Date(),
        time: formatTimeAgo(app.createdAt),
        color: '#EC4899',
        icon: 'document-text-outline'
      });
    });

    slotBookings.forEach((sb: any) => {
      items.push({
        id: `slot-${sb._id}`,
        text: `Student "${sb.student_id?.name || 'Student'}" booked practical workshop`,
        type: 'booking',
        createdAt: sb.createdAt || new Date(),
        time: formatTimeAgo(sb.createdAt),
        color: '#2563EB',
        icon: 'calendar-outline'
      });
    });

    videos.forEach((v: any) => {
      items.push({
        id: `vid-${v._id}`,
        text: `New ${v.content_type === 'material' ? 'study material' : 'lecture video'}: "${v.title}"`,
        type: 'video',
        createdAt: v.createdAt || new Date(),
        time: formatTimeAgo(v.createdAt),
        color: '#6366F1',
        icon: v.content_type === 'material' ? 'document-attach-outline' : 'play-circle-outline'
      });
    });

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, limit);
  } catch (err) {
    console.error('fetchSystemActivities error:', err);
    return [];
  }
};

// GET /api/admin/stats
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const activeCourses = await Course.countDocuments({ is_active: true });
    const pendingApprovalsCount = await User.countDocuments({ role: 'student', is_active: false });

    // Pending users list (limit 5 for dashboard view)
    const pendingUsers = await User.find({ role: 'student', is_active: false })
      .select('-password_hash')
      .sort({ createdAt: -1 })
      .limit(5);

    // Dynamic real recent activity (5 items)
    const recentActivities = await fetchSystemActivities(5);

    res.json({
      totalStudents,
      totalInstructors,
      activeCourses,
      pendingApprovalsCount,
      pendingUsers,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/activities
export const getAdminActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const activities = await fetchSystemActivities(limit);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
};

// GET /api/admin/users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const { role, status } = req.query;
  try {
    let query: any = {};
    if (role) query.role = role;
    if (status === 'pending') query.is_active = false;
    if (status === 'active') query.is_active = true;

    const users = await User.find(query).select('-password_hash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/users/:id/details
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash').lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'student') {
      const enrollments = await Enrollment.find({ student_id: user._id })
        .populate({
          path: 'batch_id',
          select: 'name start_date end_date schedule_json course_id',
          populate: { path: 'course_id', select: 'title fee duration_weeks' }
        })
        .lean();

      const results = await Result.find({ student_id: user._id })
        .populate({
          path: 'batch_id',
          select: 'name course_id',
          populate: { path: 'course_id', select: 'title' }
        })
        .lean();

      const bookings = await SlotBooking.find({ student_id: user._id })
        .populate({
          path: 'slot_id',
          populate: [
            { path: 'batch_id', select: 'name' },
            { path: 'instructor_id', select: 'name' }
          ]
        })
        .lean();

      const totalMarks = results.reduce((sum, r) => sum + (r.marks || 0), 0);
      const averageMark = results.length > 0 ? (totalMarks / results.length).toFixed(1) : 0;

      res.json({
        user,
        enrollments,
        results,
        bookings,
        averageMark
      });
    } else if (user.role === 'instructor') {
      const assignedBatches = await Batch.find({ instructor_ids: user._id })
        .populate('course_id', 'title fee duration_weeks')
        .lean();

      const batchIds = assignedBatches.map(b => b._id);
      const totalStudents = await Enrollment.countDocuments({ batch_id: { $in: batchIds }, status: 'active' });

      const videos = await Video.find({ instructor_id: user._id })
        .populate('batch_id', 'name')
        .sort({ createdAt: -1 })
        .lean();

      const practiceSlots = await PracticeSlot.find({ instructor_id: user._id })
        .populate('batch_id', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        user,
        assignedBatches,
        totalStudents,
        videos,
        practiceSlots
      });
    } else {
      res.json({ user });
    }
  } catch (error) {
    console.error('Error in getUserDetails:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/users/:id/approve
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.is_active = true;

    // If user doesn't have an index number yet, generate one
    if (!user.index_number) {
      user.index_number = await generateUniqueIndexNumber();
    }

    // Generate random 7-day temporary password e.g. TVTI#4829
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `TVTI#${randomDigits}`;
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(tempPassword, salt);
    user.must_change_password = true;
    user.temp_password_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // If there is an associated application, sync details and mark as approved
    const appFilter: any[] = [{ email: user.email.toLowerCase() }];
    if (user.nic) appFilter.push({ nic_number: user.nic });

    const application = await Application.findOne({ $or: appFilter }).sort({ createdAt: -1 });
    if (application) {
      application.status = 'approved';
      application.generated_index_number = user.index_number;
      await application.save();

      if (!user.date_of_birth && application.date_of_birth) user.date_of_birth = application.date_of_birth;
      if (!user.gender && application.gender) user.gender = application.gender;
      if (!user.address && application.address) user.address = application.address;
      if (!user.guardian && application.guardian) user.guardian = application.guardian;
      if (!user.educational_qualification && application.educational_qualification) {
        user.educational_qualification = application.educational_qualification;
      }
      if (!user.profile_photo && application.student_photo) user.profile_photo = application.student_photo;
      if (!user.payment_info || !user.payment_info.payment_method) {
        user.payment_info = {
          total_fee: application.total_course_fee || 0,
          amount_paid: application.amount_paid || 0,
          payment_status: application.payment_status || 'pending',
          payment_method: application.payment_method || 'physical_pay',
          payment_slip: application.payment_slip || '',
          receipt_number: `REC-${Date.now().toString().slice(-6)}`,
          last_updated: new Date()
        };
      }
    }

    await user.save();

    // Send official credentials email to approved user
    try {
      await sendApprovalCredentialsEmail({
        to: user.email,
        studentName: user.name,
        indexNumber: user.index_number,
        tempPassword: tempPassword
      });
    } catch (emailErr) {
      console.warn('Warning: Failed to send approval credentials email:', emailErr);
    }

    res.json({
      message: 'User approved successfully',
      user,
      credentials: {
        index_number: user.index_number,
        temp_password: tempPassword,
        email: user.email,
        student_id: user._id
      }
    });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: 'Server error during user approval' });
  }
};

// PUT /api/admin/users/:id/reject
export const rejectUser = async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body;
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ message: 'User registration rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/users/:id/deactivate
export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    user.is_active = !user.is_active; // Toggle active status
    await user.save();
    res.json({ message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/users/:id/delete — permanently remove a user and all related data
export const deleteUserCompletely = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      res.status(403).json({ message: 'Cannot delete admin accounts' });
      return;
    }

    if (user.role === 'student') {
      // Remove all student-related data
      await Enrollment.deleteMany({ student_id: user._id });
      await SlotBooking.deleteMany({ student_id: user._id });
      await Result.deleteMany({ student_id: user._id });
    } else if (user.role === 'instructor') {
      // Remove instructor from batch assignments (don't delete the batch)
      await Batch.updateMany(
        { instructor_ids: user._id },
        { $pull: { instructor_ids: user._id } }
      );
      // Remove instructor's videos, practice slots, and announcements
      await Video.deleteMany({ instructor_id: user._id });
      await PracticeSlot.deleteMany({ instructor_id: user._id });
      const Announcement = (await import('../models/Announcement')).default;
      await Announcement.deleteMany({ posted_by: user._id });
    }

    // Delete associated application if exists
    await Application.deleteMany({ email: user.email.toLowerCase() });

    // Finally delete the user
    await user.deleteOne();

    res.json({ message: `${user.role === 'student' ? 'Student' : 'Instructor'} and all related data permanently deleted` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error during deletion' });
  }
};

const generateUniqueInstructorIndexNumber = async (): Promise<string> => {
  const fullYear = new Date().getFullYear();
  const year2Digits = String(fullYear).slice(-2); // e.g. 2026 -> 26
  const prefix = `${year2Digits}I`;
  const regex = new RegExp(`^${year2Digits}I(\\d+)`);
  const users = await User.find({ index_number: { $regex: regex } }).select('index_number');

  let maxSeq = 0;
  for (const u of users) {
    if (u.index_number) {
      const match = u.index_number.match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

// POST /api/admin/users/instructor
export const createInstructor = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, nic } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Generate random 7-day temporary password e.g. TVTI#4829
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `TVTI#${randomDigits}`;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);
    const index_number = await generateUniqueInstructorIndexNumber();

    const user = await User.create({
      name,
      email,
      password_hash,
      role: 'instructor',
      phone,
      nic,
      index_number,
      is_active: true, // Instructors created by admin are automatically active
      must_change_password: true,
      temp_password_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
    });

    res.status(201).json({
      message: 'Instructor created successfully',
      _id: user._id,
      index_number: user.index_number,
      temp_password: tempPassword,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
