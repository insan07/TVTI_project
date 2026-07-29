import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Application from '../models/Application';
import User from '../models/User';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';

export const generateUniqueIndexNumber = async (): Promise<string> => {
  const fullYear = new Date().getFullYear();
  const year2Digits = String(fullYear).slice(-2); // e.g. 2026 -> 26
  const prefix = `${year2Digits}T`;
  const regex = new RegExp(`^${year2Digits}T(\\d+)`);
  const users = await User.find({ index_number: { $regex: regex } }).select('index_number');

  let maxSeq = 0;
  for (const u of users) {
    if (u.index_number) {
      const match = u.index_number.match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, nic_number, email, phone, course_id, terms_accepted } = req.body;

    if (!full_name || !nic_number || !email || !phone || !course_id) {
      res.status(400).json({ message: 'All application fields are required' });
      return;
    }

    if (!terms_accepted) {
      res.status(400).json({ message: 'You must accept the Terms & Conditions to apply' });
      return;
    }

    // Check if application already submitted with this email or NIC for pending status
    const existingApp = await Application.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { nic_number: nic_number.trim() }],
      status: { $in: ['pending', 'contacted', 'paid'] }
    });

    if (existingApp) {
      res.status(400).json({
        message: 'An active application with this email or NIC already exists. Please await admin review.'
      });
      return;
    }

    const application = await Application.create({
      full_name: full_name.trim(),
      nic_number: nic_number.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      course_id,
      status: 'pending',
      terms_accepted: true,
      terms_accepted_at: new Date(),
      submitted_at: new Date()
    });

    res.status(201).json({
      message: 'Application submitted successfully. Awaiting TVTI admin review.',
      application
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    res.status(400).json({ message: error.message || 'Server error during application submission' });
  }
};

export const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate('course_id', 'title fee duration_weeks')
      .sort({ createdAt: -1 })
      .lean();

    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const application = await Application.findById(id).populate('course_id');
    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    application.status = status;

    let generatedCredentials = null;

    if (status === 'approved') {
      // Find existing student by email or NIC safely
      const orConditions: any[] = [{ email: application.email.toLowerCase() }];
      if (application.nic_number && application.nic_number.trim()) {
        orConditions.push({ nic: application.nic_number.trim() });
      }
      let studentUser = await User.findOne({ $or: orConditions });

      // Generate Temp Password e.g. TVTI#4829
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const tempPassword = `TVTI#${randomDigits}`;
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(tempPassword, salt);
      const temp_password_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      let indexNumber = '';

      if (studentUser) {
        // If user exists without index_number, assign one
        if (!studentUser.index_number) {
          studentUser.index_number = await generateUniqueIndexNumber();
        }
        indexNumber = studentUser.index_number;
        studentUser.password_hash = password_hash;
        studentUser.must_change_password = true;
        studentUser.temp_password_expires_at = temp_password_expires_at;
        studentUser.is_active = true;
        studentUser.role = 'student';
        await studentUser.save();
      } else {
        // Create new Student User
        indexNumber = await generateUniqueIndexNumber();
        studentUser = await User.create({
          name: application.full_name,
          email: application.email.toLowerCase(),
          phone: application.phone,
          nic: application.nic_number,
          index_number: indexNumber,
          password_hash,
          role: 'student',
          is_active: true,
          must_change_password: true,
          temp_password_expires_at
        });
      }

      application.generated_index_number = indexNumber;

      generatedCredentials = {
        index_number: indexNumber,
        temp_password: tempPassword,
        email: application.email,
        student_id: studentUser._id
      };

      // Auto-enroll into active batch for this course if available
      try {
        const activeBatch = await Batch.findOne({ course_id: application.course_id }).sort({ createdAt: -1 });
        if (activeBatch) {
          const existingEnrollment = await Enrollment.findOne({
            student_id: studentUser._id,
            batch_id: activeBatch._id
          });
          if (!existingEnrollment) {
            await Enrollment.create({
              student_id: studentUser._id,
              batch_id: activeBatch._id,
              enrolled_date: new Date(),
              status: 'active'
            });
          }
        }
      } catch (enrollErr) {
        console.warn('Auto enrollment warning:', enrollErr);
      }
    }

    await application.save();

    res.json({
      message: `Application marked as ${status}`,
      application,
      credentials: generatedCredentials
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Server error updating application status' });
  }
};
