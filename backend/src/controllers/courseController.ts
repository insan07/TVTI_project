import { Request, Response } from 'express';
import Course from '../models/Course';

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
    res.json(courses.map(c => ({ ...c, enrollment_count: 0 })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const archiveCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
