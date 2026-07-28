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
import bcrypt from 'bcryptjs';
import { generateUniqueIndexNumber } from './applicationController';

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

    // Dynamic recent activity
    const recentCourses = await Course.find().sort({ createdAt: -1 }).limit(2);
    const recentActivities = [
      ...(recentCourses.map(c => ({
        id: c._id.toString(),
        text: `New course "${c.title}" published.`,
        time: 'Recently'
      }))),
      { id: 'act-1', text: 'System maintenance scheduled for 02:00 AM.', time: '2 hours ago' },
      { id: 'act-2', text: 'Batch 44 completed module Safety Protocols.', time: 'Yesterday, 4:30 PM' }
    ];

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

    await user.save();

    // If there is an associated application, mark it as approved
    const appFilter: any[] = [{ email: user.email.toLowerCase() }];
    if (user.nic) appFilter.push({ nic_number: user.nic });

    await Application.findOneAndUpdate(
      { $or: appFilter },
      { status: 'approved', generated_index_number: user.index_number }
    );

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

// POST /api/admin/users/instructor
export const createInstructor = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password_hash,
      role: 'instructor',
      phone,
      is_active: true, // Instructors created by admin are automatically active
    });

    res.status(201).json({ message: 'Instructor created successfully', _id: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
