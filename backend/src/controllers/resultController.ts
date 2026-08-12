import { Request, Response } from 'express';
import Result from '../models/Result';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendNotification } from '../services/notificationService';

export const getMyResults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.query;
    const query: any = { student_id: req.user._id };
    if (batchId && batchId !== 'all') {
      query.batch_id = batchId;
    }
    const results = await Result.find(query)
      .populate({
        path: 'batch_id',
        select: 'name course_id',
        populate: { path: 'course_id', select: 'title' }
      })
      .lean();
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBatchResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const results = await Result.find({ batch_id: batchId }).populate('student_id', 'name email').lean();
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, batch_id, assessment_name, marks } = req.body;
    let grade = 'Fail';
    if (marks >= 75) grade = 'A';
    else if (marks >= 65) grade = 'B';
    else if (marks >= 55) grade = 'C';
    else if (marks >= 40) grade = 'Pass';
    
    const result = new Result({ student_id, batch_id, assessment_name, marks, grade });
    await result.save();

    // Send instant notification to student
    await sendNotification({
      userIds: [student_id],
      title: 'New Exam Result Published',
      message: `Your result for "${assessment_name}" has been published: Marks: ${marks}, Grade: ${grade}.`,
      type: 'new_result',
      relatedId: result._id,
      link: '/results'
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { marks, assessment_name } = req.body;
    
    let grade = 'Fail';
    if (marks >= 75) grade = 'A';
    else if (marks >= 65) grade = 'B';
    else if (marks >= 55) grade = 'C';
    else if (marks >= 40) grade = 'Pass';

    const updateData: any = { marks, grade };
    if (assessment_name) updateData.assessment_name = assessment_name;

    const result = await Result.findByIdAndUpdate(id, updateData, { new: true });
    if (!result) {
      res.status(404).json({ message: 'Result not found' });
      return;
    }

    // Send instant notification to student on updated result
    await sendNotification({
      userIds: [result.student_id.toString()],
      title: 'Result Updated',
      message: `Your result for "${result.assessment_name}" was updated: Marks: ${marks}, Grade: ${grade}.`,
      type: 'new_result',
      relatedId: result._id,
      link: '/results'
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
