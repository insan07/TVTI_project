import { Request, Response } from 'express';
import User from '../models/User';
import Application from '../models/Application';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOtp, verifyOtp, isEmailVerified, consumeEmailVerification } from '../services/otpService';
import { sendPasswordResetEmail } from '../services/emailService';

const generateToken = (id: string, expiresIn: any = '7d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, identifier, password } = req.body;
  const loginId = String(identifier || email || '').trim();
  const passStr = String(password ?? '');

  try {
    if (!loginId || !passStr) {
      res.status(400).json({ message: 'Index Number/Email and Password are required' });
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { index_number: loginId },
        { index_number: loginId.toUpperCase() },
        { index_number: new RegExp(`^${loginId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      ]
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid Index Number/Email or Password' });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({ message: 'Account is pending approval or inactive' });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ message: 'Invalid Index Number/Email or Password' });
      return;
    }

    const isMatch = await bcrypt.compare(passStr, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid Index Number/Email or Password' });
      return;
    }

    // Check if temporary password has expired (7 days limit)
    if (user.must_change_password && user.temp_password_expires_at) {
      if (new Date() > new Date(user.temp_password_expires_at)) {
        res.status(400).json({
          message: 'Your temporary password has expired after 7 days. Please contact TVTI Admin for a password reset.'
        });
        return;
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      index_number: user.index_number,
      must_change_password: user.must_change_password || false,
      token: generateToken(String(user._id)),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: error?.message || String(error)
    });
  }
};

export const forceChangePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const { newPassword, nic, newName, newEmail } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify NIC number if explicitly supplied in request body
    if (nic && user.nic && nic.trim().toUpperCase() !== user.nic.toUpperCase()) {
      res.status(400).json({ message: 'Verification failed. NIC number does not match.' });
      return;
    }

    // Update name if newName is provided
    if (newName && newName.trim()) {
      user.name = newName.trim();
    }

    // Update email if newEmail is provided and has changed
    if (newEmail && newEmail.trim() && newEmail.trim().toLowerCase() !== user.email) {
      const cleanedEmail = newEmail.trim().toLowerCase();
      const emailExists = await User.findOne({ email: cleanedEmail });
      if (emailExists) {
        res.status(400).json({ message: 'Email address is already in use by another account.' });
        return;
      }
      user.email = cleanedEmail;
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.must_change_password = false;
    user.temp_password_expires_at = undefined;
    user.password_set_at = new Date();

    await user.save();

    res.json({
      message: 'Password updated successfully. Access granted.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        index_number: user.index_number,
        must_change_password: false
      }
    });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({ message: 'Server error updating password' });
  }
};

export const checkEligibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, nic } = req.body;

    if (email) {
      const cleanEmail = String(email).toLowerCase().trim();
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'An account with this email address is already registered. Please log in to your account.'
        });
        return;
      }

      const approvedApp = await Application.findOne({ email: cleanEmail, status: 'approved' });
      if (approvedApp) {
        res.status(400).json({
          success: false,
          message: 'An approved application already exists for this email address. Please log in.'
        });
        return;
      }
    }

    if (nic && String(nic).trim()) {
      const cleanNic = String(nic).trim();
      const existingUserNic = await User.findOne({ nic: cleanNic });
      if (existingUserNic) {
        res.status(400).json({
          success: false,
          message: `The NIC number (${cleanNic}) is already registered to an existing student account.`
        });
        return;
      }

      const approvedAppNic = await Application.findOne({ nic_number: cleanNic, status: 'approved' });
      if (approvedAppNic) {
        res.status(400).json({
          success: false,
          message: `The NIC number (${cleanNic}) is already registered to an approved student application.`
        });
        return;
      }
    }

    res.status(200).json({ success: true, message: 'Eligible for registration' });
  } catch (error: any) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error checking eligibility' });
  }
};

export const sendOtpHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. Pre-check if an active user already exists with this email
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'An account with this email address is already registered. Please log in to your account.'
      });
      return;
    }

    // 2. Pre-check if an approved student application exists for this email
    const approvedApp = await Application.findOne({ email: cleanEmail, status: 'approved' });
    if (approvedApp) {
      res.status(400).json({
        success: false,
        message: 'An approved application already exists for this email address. Please log in.'
      });
      return;
    }

    const result = await sendOtp(cleanEmail);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error sending OTP' });
  }
};

export const verifyOtpHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required' });
      return;
    }

    const result = await verifyOtp(email, otp);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error verifying OTP' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone, nic, desired_course } = req.body;
  try {
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const verified = await isEmailVerified(email);
    if (!verified) {
      res.status(400).json({ message: 'Email address must be verified via OTP before registering.' });
      return;
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password_hash,
      role: 'student', // default self-registration role
      phone,
      nic,
      desired_course,
      is_active: false, // pending admin approval
    });

    await consumeEmailVerification(email);

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

    await sendPasswordResetEmail({ to: user.email, resetLink });

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
