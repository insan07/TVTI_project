import { Request, Response } from 'express';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';

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

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await Batch.create(req.body);
    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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

export const getBatchStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ batch_id: req.params.id })
      .populate('student_id', 'name email nic');
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

    const enrollmentsToCreate = studentIds.map((id: string) => ({
      student_id: id,
      batch_id,
      enrolled_date: new Date(),
      status: 'active'
    }));

    await Enrollment.insertMany(enrollmentsToCreate);

    res.json({ message: 'Students enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
