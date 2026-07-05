import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';

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

// PUT /api/admin/users/:id/approve
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    user.is_active = true;
    await user.save();
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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
    // Note: Here you can integrate Nodemailer to send a rejection reason if provided
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
    user.is_active = false;
    await user.save();
    res.json({ message: 'User deactivated successfully' });
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
