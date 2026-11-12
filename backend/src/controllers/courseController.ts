import { Request, Response } from 'express';
import Course from '../models/Course';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import { courseValues, deleteUnusedCourse, validManagementId } from '../services/courseBatchManagement';
import { PracticalError } from '../services/practicalScheduling';

export const getActiveCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ is_active: true }).select('_id title fee duration_weeks');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAdminCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 }).lean();
    const [batches, counts] = await Promise.all([
      Batch.find().select('course_id status').lean(),
      Enrollment.aggregate([{ $match: { status: { $ne: 'dropped' } } }, { $group: { _id: '$batch_id', count: { $sum: 1 } } }]),
    ]);
    const byBatch = new Map(counts.map(row => [String(row._id), row.count]));
    res.json(courses.map(course => {
      const assigned = batches.filter(batch => String(batch.course_id) === String(course._id));
      return { ...course, batch_count: assigned.length, active_batch_count: assigned.filter(batch => batch.status === 'active').length,
        enrollment_count: assigned.reduce((total, batch) => total + (byBatch.get(String(batch._id)) || 0), 0) };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.create(courseValues({ is_active: true, ...req.body }));
    res.status(201).json(course);
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(400).json({ message: error.message || 'Server error' });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!validManagementId(req.params.id)) throw new PracticalError(400, 'Invalid course.');
    const course = await Course.findById(req.params.id);
    if (!course) { res.status(404).json({ message: 'Course not found.' }); return; }
    Object.assign(course, courseValues({ ...course.toObject(), ...req.body }));
    await course.save();
    res.json(course);
  } catch (error: any) {
    console.error('Error updating course:', error);
    res.status(400).json({ message: error.message || 'Server error' });
  }
};

export const archiveCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!validManagementId(req.params.id)) throw new PracticalError(400, 'Invalid course.');
    const course = await Course.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true, runValidators: true });
    if (!course) { res.status(404).json({ message: 'Course not found.' }); return; }
    res.json(course);
  } catch (error: any) {
    console.error('Error archiving course:', error);
    res.status(400).json({ message: error.message || 'Server error' });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteUnusedCourse(String(req.params.id));
    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    res.status(error instanceof PracticalError ? error.status : 500).json({ message: error instanceof PracticalError ? error.message : 'Course could not be deleted. Please try again.' });
  }
};
