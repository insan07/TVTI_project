import { Request, Response } from 'express';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import Result from '../models/Result';
import Video from '../models/Video';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import User from '../models/User';
import { sendBatchAssignmentEmail } from '../services/emailService';
export const getAdminBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const batches = await Batch.find()
      .populate('course_id', 'title fee')
      .populate('instructor_ids', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const enrollmentsCount = await Enrollment.aggregate([
      { $group: { _id: '$batch_id', count: { $sum: 1 } } }
    ]);

    const batchStats = batches.map(b => {
      const eCount = enrollmentsCount.find(e => String(e._id) === String(b._id))?.count || 0;
      return { ...b, enrolled_count: eCount };
    });

    res.json(batchStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBatchDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('course_id', 'title fee description duration_weeks')
      .populate('instructor_ids', 'name email phone')
      .lean();

    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    const enrollments = await Enrollment.find({ batch_id: batch._id })
      .populate('student_id', 'name email phone nic index_number is_active createdAt')
      .lean();

    const results = await Result.find({ batch_id: batch._id })
      .populate('student_id', 'name email index_number')
      .lean();

    const videos = await Video.find({ batch_id: batch._id })
      .populate('instructor_id', 'name')
      .lean();

    res.json({
      batch,
      enrollments,
      results,
      videos,
      enrolled_count: enrollments.length
    });
  } catch (error) {
    console.error('Error in getBatchDetails:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await Batch.create(req.body);
    res.status(201).json(batch);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Server error' });
  }
};

export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBatchCompletely = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    // Delete associated enrollments, results, videos
    await Enrollment.deleteMany({ batch_id: batchId });
    await Result.deleteMany({ batch_id: batchId });
    await Video.deleteMany({ batch_id: batchId });

    // Delete associated practice slots and their bookings
    const slots = await PracticeSlot.find({ batch_id: batchId }).select('_id');
    const slotIds = slots.map(s => s._id);
    
    if (slotIds.length > 0) {
      await SlotBooking.deleteMany({ slot_id: { $in: slotIds } });
      await PracticeSlot.deleteMany({ batch_id: batchId });
    }

    // Delete the batch
    await batch.deleteOne();

    res.json({ message: 'Batch and all related records deleted completely' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ message: 'Server error during batch deletion' });
  }
};

export const getBatchStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ batch_id: req.params.id })
      .populate('student_id', 'name email nic index_number phone');
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const enrollStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIds } = req.body;
    const batch_id = req.params.id;

    const batch = await Batch.findById(batch_id);
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    const currentEnrollments = await Enrollment.countDocuments({ batch_id });
    if (currentEnrollments + studentIds.length > batch.capacity) {
      res.status(400).json({ message: 'Batch capacity exceeded' });
      return;
    }

    // Find existing enrollments for this batch to prevent duplicates
    const existingEnrollments = await Enrollment.find({ batch_id });
    const existingStudentIds = new Set(existingEnrollments.map(e => e.student_id.toString()));

    const newStudentIds = studentIds.filter((id: string) => !existingStudentIds.has(id.toString()));

    if (newStudentIds.length === 0) {
      res.json({ message: 'All selected students are already enrolled in this batch' });
      return;
    }

    const enrollmentsToCreate = newStudentIds.map((id: string) => ({
      student_id: id,
      batch_id,
      enrolled_date: new Date(),
      status: 'active'
    }));

    const createdEnrollments = await Enrollment.insertMany(enrollmentsToCreate);

    const Course = (await import('../models/Course')).default;
    const course = await Course.findById(batch.course_id);

    for (const enrollment of createdEnrollments) {
      const student = await User.findById(enrollment.student_id);
      if (student && course) {
        try {
          await sendBatchAssignmentEmail({
            to: student.email,
            studentName: student.name,
            registrationNumber: student.index_number || student.registration_number || 'N/A',
            courseName: (course as any).title || 'TVTI Course',
            batchName: batch.name,
            startDate: new Date(batch.start_date).toLocaleDateString(),
            endDate: new Date(batch.end_date).toLocaleDateString()
          });
          await Enrollment.findByIdAndUpdate(enrollment._id, {
            batch_assignment_email_sent: true,
            batch_assignment_email_sent_at: new Date()
          });
        } catch (emailErr: any) {
          await Enrollment.findByIdAndUpdate(enrollment._id, {
            batch_assignment_email_sent: false,
            batch_assignment_email_error: emailErr.message || String(emailErr)
          });
        }
      }
    }

    res.json({ message: 'Students enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
