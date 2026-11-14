import { Request, Response } from 'express';
import Batch from '../models/Batch';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import User from '../models/User';
import { validManagementId } from '../services/courseBatchManagement';

function enrolledStudents(scope: 'course' | 'batch') {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      if (!validManagementId(id)) { res.status(400).json({ message: `Invalid ${scope}.` }); return; }
      const exists = scope === 'course' ? await Course.exists({ _id: id }) : await Batch.exists({ _id: id });
      if (!exists) { res.status(404).json({ message: `${scope === 'course' ? 'Course' : 'Batch'} not found.` }); return; }
      const batchIds = scope === 'course' ? await Batch.find({ course_id: id }).distinct('_id') : [id];
      const studentIds = await Enrollment.find({ batch_id: { $in: batchIds }, status: { $ne: 'dropped' } }).distinct('student_id');
      // A student enrolled in multiple batches of one course appears only once.
      const students = await User.find({ _id: { $in: studentIds }, role: 'student' })
        .select('_id name registration_number profile_photo')
        .collation({ locale: 'en', strength: 2 })
        .sort({ name: 1, registration_number: 1, _id: 1 })
        .lean();
      res.json(students);
    } catch {
      res.status(500).json({ message: 'Enrolled students could not be loaded. Please try again.' });
    }
  };
}

export const getCourseEnrolledStudents = enrolledStudents('course');
export const getBatchEnrolledStudents = enrolledStudents('batch');
