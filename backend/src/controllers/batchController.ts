import { Request, Response } from 'express';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import Result from '../models/Result';
import Video from '../models/Video';
import User from '../models/User';
import { sendBatchAssignmentEmail } from '../services/emailService';
import { assignStudentsToBatch } from '../services/studentAdmissions';
import { PracticalError } from '../services/practicalScheduling';
import { sendNotification } from '../services/notificationService';
import { saveManagedBatch, deleteEmptyBatch, validManagementId } from '../services/courseBatchManagement';
export const getAdminBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const batches = await Batch.find()
      .populate('course_id', 'title fee')
      .populate('instructor_ids', 'name profile_photo')
      .sort({ createdAt: -1 })
      .lean();

    const enrollmentsCount = await Enrollment.aggregate([
      { $match: { status: { $ne: 'dropped' } } },
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
    if (!validManagementId(req.params.id)) { res.status(400).json({ message: 'Invalid batch.' }); return; }
    const batch = await Batch.findById(req.params.id)
      .populate('course_id', 'title fee description duration_weeks is_active')
      .populate('instructor_ids', 'name email phone profile_photo')
      .lean();

    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    const enrollments = await Enrollment.find({ batch_id: batch._id })
      .populate('student_id', 'name email phone nic index_number registration_number is_active createdAt profile_photo')
      .lean();

    const results = await Result.find({ batch_id: batch._id })
      .populate('student_id', 'name email index_number registration_number profile_photo')
      .lean();

    const videos = await Video.find({ batch_id: batch._id })
      .populate('instructor_id', 'name profile_photo')
      .lean();

    res.json({
      batch,
      enrollments,
      results,
      videos,
      enrolled_count: enrollments.filter(entry => entry.status !== 'dropped').length
    });
  } catch (error) {
    console.error('Error in getBatchDetails:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delivery happens after the transaction; notification failure must never report a saved batch as failed.
async function notifyBatch(batch: any, previousInstructorIds: string[], created: boolean) {
  let delivered = true;
  const safely = async (payload: any) => { try { await sendNotification(payload); } catch { delivered = false; } };
  const added = batch.instructor_ids.map(String).filter((id: string) => !previousInstructorIds.includes(id));
  const removed = previousInstructorIds.filter(id => !batch.instructor_ids.map(String).includes(id));
  if (added.length) await safely({ userIds: added, title: 'Assigned to Batch', message: `You have been assigned to batch "${batch.name}".`, type: 'batch_assigned', relatedId: batch._id, link: '/instructor/home' });
  if (removed.length) await safely({ userIds: removed, title: 'Batch Assignment Updated', message: `You are no longer assigned to batch "${batch.name}".`, type: 'batch_assigned', relatedId: batch._id, link: '/instructor/home' });
  if (!created) {
    const payload = { title: 'Batch Updated', message: `The details for batch "${batch.name}" have been updated. Status: ${batch.status}.`, type: 'schedule_change', relatedId: batch._id, link: '/schedule' };
    await safely({ ...payload, batchId: batch._id });
    if (batch.instructor_ids.length) await safely({ ...payload, userIds: batch.instructor_ids.map(String) });
  }
  return delivered;
}
const batchFailure = (res: Response, error: any) => res.status(error instanceof PracticalError ? error.status : 400).json({ message: error instanceof PracticalError ? error.message : 'Batch could not be saved. Check the details and try again.' });
export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batch, previousInstructorIds } = await saveManagedBatch(null, req.body);
    const notification_sent = await notifyBatch(batch, previousInstructorIds, true);
    res.status(201).json({ ...batch.toObject(), notification_sent });
  } catch (error) { batchFailure(res, error); }
};
export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batch, previousInstructorIds } = await saveManagedBatch(String(req.params.id), req.body);
    const notification_sent = await notifyBatch(batch, previousInstructorIds, false);
    res.json({ ...batch.toObject(), notification_sent });
  } catch (error) { batchFailure(res, error); }
};
export const deleteBatchCompletely = async (req: Request, res: Response): Promise<void> => {
  try { await deleteEmptyBatch(String(req.params.id)); res.json({ message: 'Empty batch deleted successfully.' }); }
  catch (error) { batchFailure(res, error); }
};

export const getBatchStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!validManagementId(req.params.id)) { res.status(400).json({ message: 'Invalid batch.' }); return; }
    if (!await Batch.exists({ _id: req.params.id })) { res.status(404).json({ message: 'Batch not found.' }); return; }
    const enrollments = await Enrollment.find({ batch_id: req.params.id })
      .populate('student_id', 'name email nic index_number registration_number phone profile_photo');
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const enrollStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batch, enrollments: createdEnrollments, newStudentIds } = await assignStudentsToBatch(String(req.params.id), req.body.studentIds);
    if (newStudentIds.length === 0) { res.json({ message: 'All selected students are already enrolled in this batch' }); return; }

    const Course = (await import('../models/Course')).default;
    const course = await Course.findById(batch.course_id);

    for (const enrollment of createdEnrollments) {
      if (!enrollment) continue;
      const student = await User.findById(enrollment.student_id);
      if (student && course) {
        try {
          await sendBatchAssignmentEmail({
            to: student.email,
            studentName: student.name,
            registrationNumber: student.registration_number || student.index_number || 'Not assigned',
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

    // Enrollment has committed; delivery failures do not undo assigned seats.
    let notification_sent = true;
    const notify = async (payload: any) => { try { await sendNotification(payload); } catch { notification_sent = false; } };
    await notify({
      userIds: newStudentIds.map((id: string) => String(id)),
      title: 'Enrolled in Batch 🎉',
      message: `You have been enrolled in batch "${batch.name}"${course ? ` for ${(course as any).title}` : ''}.`,
      type: 'batch_assigned',
      relatedId: batch._id,
      link: '/schedule'
    });

    if (Array.isArray(batch.instructor_ids) && batch.instructor_ids.length > 0) {
      await notify({
        userIds: batch.instructor_ids.map(id => String(id)),
        title: 'New Students Enrolled',
        message: `${newStudentIds.length} new student(s) have been enrolled in your batch "${batch.name}".`,
        type: 'student_enrolled',
        relatedId: batch._id,
        link: '/instructor/students'
      });
    }

    res.json({ message: 'Students enrolled successfully', notification_sent, email_sent: !await Enrollment.exists({ _id: { $in: createdEnrollments.map(entry => entry!._id) }, batch_assignment_email_sent: { $ne: true } }) });
  } catch (error: any) {
    res.status(error instanceof PracticalError ? error.status : 500).json({ message: error instanceof PracticalError ? error.message : 'Enrollment failed. Please try again.' });
  }
};
