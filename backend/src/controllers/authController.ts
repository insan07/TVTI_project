import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const generateToken = (id: string, expiresIn: any = '7d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({ message: 'Account is pending approval or inactive' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(String(user._id)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone, nic, desired_course } = req.body;
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
      role: 'student', // default self-registration role
      phone,
      nic,
      desired_course,
      is_active: false, // pending admin approval
    });

    res.status(201).json({
      message: 'Registration successful. Waiting for admin approval.',
      _id: user._id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const resetPasswordRequest = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Generate 1-hour token for reset
    const resetToken = generateToken(String(user._id), '1h');
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Send email via Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"LMS Admin" <noreply@lms.com>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link will expire in 1 hour.</p>`,
    });

    res.json({ message: 'Password reset link sent to email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secret') as any;
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};
