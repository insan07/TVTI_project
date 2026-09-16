import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Application from '../models/Application';
import User from '../models/User';
import Course from '../models/Course';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import { sendNotification } from '../services/notificationService';
import { isEmailVerified, consumeEmailVerification } from '../services/otpService';
import { sendApplicationSubmissionEmail, sendApprovalEmail } from '../services/emailService';

/**
 * Generates a sequential, unique Registration Number in the format TVTI-YYYY-00001
 */
export const generateUniqueRegistrationNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `TVTI-${currentYear}-`;
  const regex = new RegExp(`^TVTI-${currentYear}-(\\d+)`);

  const [users, applications] = await Promise.all([
    User.find({ registration_number: { $regex: regex } }).select('registration_number'),
    Application.find({ registration_number: { $regex: regex } }).select('registration_number')
  ]);

  let maxSeq = 0;
  const processRegNo = (regNo?: string) => {
    if (regNo) {
      const match = regNo.match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  };

  for (const u of users) processRegNo(u.registration_number);
  for (const a of applications) processRegNo(a.registration_number);

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
};

/**
 * Generates a secure random temporary password (e.g. TVTI@K7mP92x)
 */
export const generateTemporaryPassword = (): string => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let randomStr = '';
  const bytes = crypto.randomBytes(7);
  for (let i = 0; i < 7; i++) {
    randomStr += charset[bytes[i] % charset.length];
  }
  return `TVTI@${randomStr}`;
};


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
    const {
      full_name,
      nic_number,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      guardian,
      educational_qualification,
      student_photo,
      payment_method,
      payment_slip,
      course_id,
      course_ids,
      terms_accepted
    } = req.body;

    let selectedCourseIds: string[] = [];
    if (Array.isArray(course_ids) && course_ids.length > 0) {
      selectedCourseIds = course_ids;
    } else if (course_id) {
      selectedCourseIds = [course_id];
    }

    if (!full_name || !email || !phone || selectedCourseIds.length === 0) {
      res.status(400).json({ message: 'Full name, email, phone, and at least one course selection are required' });
      return;
    }

    if (!terms_accepted) {
      res.status(400).json({ message: 'You must accept the Terms & Conditions to apply' });
      return;
    }

    // Verify email was verified through OTP before allowing application submission
    const verified = await isEmailVerified(email);
    if (!verified) {
      res.status(400).json({
        message: 'Email address must be verified via OTP before submitting the application.'
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanNic = nic_number ? nic_number.trim() : undefined;

    // Check if email already exists as a registered user
    const existingUserEmail = await User.findOne({ email: cleanEmail });
    if (existingUserEmail) {
      res.status(400).json({
        message: 'This email address is already registered in the system. Please log in to your account.'
      });
      return;
    }

    // Check if an approved application already exists for this email
    const approvedAppEmail = await Application.findOne({ email: cleanEmail, status: 'approved' });
    if (approvedAppEmail) {
      res.status(400).json({
        message: 'An approved application already exists for this email address. Please log in.'
      });
      return;
    }

    // Check if NIC already registered to a user or approved application
    if (cleanNic) {
      const existingUserNic = await User.findOne({ nic: cleanNic });
      if (existingUserNic) {
        res.status(400).json({
          message: `The NIC number (${cleanNic}) is already registered to an existing student account.`
        });
        return;
      }
      const approvedAppNic = await Application.findOne({ nic_number: cleanNic, status: 'approved' });
      if (approvedAppNic) {
        res.status(400).json({
          message: `The NIC number (${cleanNic}) is already registered to an approved student application.`
        });
        return;
      }
    }

    // If an un-approved application with this email already exists in pending status, clean it up so the new submission replaces it seamlessly
    await Application.deleteMany({
      email: cleanEmail,
      status: 'pending'
    });

    // Normalize date of birth, gender, address
    const dob = date_of_birth || req.body.dob || undefined;
    const gndr = gender || req.body.gender || undefined;
    const addr = address || req.body.residential_address || undefined;

    // Normalize guardian object (supports nested or flat fields)
    let guardianData: any = undefined;
    if (guardian && (guardian.name || guardian.phone || guardian.relationship)) {
      guardianData = {
        name: guardian.name ? guardian.name.trim() : undefined,
        relationship: guardian.relationship || 'Father',
        phone: guardian.phone ? guardian.phone.trim() : undefined,
        occupation: guardian.occupation ? guardian.occupation.trim() : undefined
      };
    } else if (req.body.guardian_name || req.body.guardian_phone) {
      guardianData = {
        name: req.body.guardian_name ? req.body.guardian_name.trim() : undefined,
        relationship: req.body.guardian_relationship || 'Father',
        phone: req.body.guardian_phone ? req.body.guardian_phone.trim() : undefined,
        occupation: req.body.guardian_occupation ? req.body.guardian_occupation.trim() : undefined
      };
    }

    // Normalize educational qualification object (supports nested or flat fields)
    let eduData: any = undefined;
    if (educational_qualification && (educational_qualification.highest_level || educational_qualification.institute_name || educational_qualification.details)) {
      eduData = {
        highest_level: educational_qualification.highest_level || 'O/L Completed',
        grade_level: educational_qualification.grade_level ? educational_qualification.grade_level.trim() : undefined,
        institute_name: educational_qualification.institute_name ? educational_qualification.institute_name.trim() : undefined,
        details: educational_qualification.details ? educational_qualification.details.trim() : undefined
      };
    } else if (req.body.education_level || req.body.school_name || req.body.highest_level || req.body.qualification_details || req.body.details) {
      eduData = {
        highest_level: req.body.education_level || req.body.highest_level || 'O/L Completed',
        grade_level: req.body.grade_level ? req.body.grade_level.trim() : undefined,
        institute_name: req.body.school_name ? req.body.school_name.trim() : (req.body.institute_name ? req.body.institute_name.trim() : undefined),
        details: req.body.qualification_details ? req.body.qualification_details.trim() : (req.body.details ? req.body.details.trim() : undefined)
      };
    }

    const application = await Application.create({
      full_name: full_name.trim(),
      nic_number: nic_number ? nic_number.trim() : undefined,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      date_of_birth: dob ? String(dob).trim() : undefined,
      gender: gndr ? String(gndr).trim() : undefined,
      address: addr ? String(addr).trim() : undefined,
      guardian: guardianData,
      educational_qualification: eduData,
      student_photo: student_photo || undefined,
      payment_method: payment_method || 'physical_pay',
      payment_slip: payment_slip || undefined,
      total_course_fee: 0,
      amount_paid: 0,
      payment_status: 'pending',
      course_id: selectedCourseIds[0],
      course_ids: selectedCourseIds,
      status: 'pending',
      terms_accepted: true,
      terms_accepted_at: new Date(),
      submitted_at: new Date(),
      email_verified: true
    });

    // Consume the OTP verification record so it cannot be reused
    await consumeEmailVerification(email);

    // Send confirmation email asynchronously (non-blocking)
    sendApplicationSubmissionEmail({
      to: application.email,
      studentName: application.full_name
    }).catch(emailErr => {
      console.warn('Warning: Failed to send submission confirmation email:', emailErr);
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
      .populate('course_ids', 'title fee duration_weeks')
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
    const { status, assigned_course_ids, total_course_fee, amount_paid, payment_status } = req.body;

    const application = await Application.findById(id).populate('course_id').populate('course_ids');
    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    if (status === 'approved' && application.status === 'approved') {
      res.status(400).json({
        message: 'This application has already been approved. Duplicate approval is not permitted.',
        application
      });
      return;
    }

    application.status = status;
    if (assigned_course_ids && Array.isArray(assigned_course_ids) && assigned_course_ids.length > 0) {
      application.course_ids = assigned_course_ids as any;
      application.course_id = assigned_course_ids[0] as any;
    }

    if (total_course_fee !== undefined) {
      application.total_course_fee = Number(total_course_fee);
    }
    if (amount_paid !== undefined) {
      application.amount_paid = Number(amount_paid);
    }
    if (payment_status) {
      application.payment_status = payment_status;
    }

    let generatedCredentials = null;
    let regNumber = application.registration_number;
    let emailSent = false;
    let emailError: string | undefined = undefined;

    if (status === 'approved') {
      const orConditions: any[] = [{ email: application.email.toLowerCase() }];
      if (application.nic_number && application.nic_number.trim()) {
        orConditions.push({ nic: application.nic_number.trim() });
      }
      let studentUser = await User.findOne({ $or: orConditions });

      // Generate Registration Number if not already assigned
      if (!regNumber) {
        regNumber = await generateUniqueRegistrationNumber();
      }

      // Generate Secure Random Temp Password e.g. TVTI@K7mP92x
      const tempPassword = generateTemporaryPassword();
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(tempPassword, salt);
      const temp_password_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      let indexNumber = '';

      if (studentUser) {
        // If user exists without index_number or registration_number, assign them
        if (!studentUser.index_number) {
          studentUser.index_number = await generateUniqueIndexNumber();
        }
        studentUser.registration_number = regNumber;
        indexNumber = studentUser.index_number;
        studentUser.password_hash = password_hash;
        studentUser.must_change_password = true;
        studentUser.temp_password_expires_at = temp_password_expires_at;
        studentUser.is_active = true;
        studentUser.nic = application.nic_number || studentUser.nic;
        studentUser.date_of_birth = application.date_of_birth || studentUser.date_of_birth;
        studentUser.gender = application.gender || studentUser.gender;
        studentUser.address = application.address || studentUser.address;
        studentUser.guardian = application.guardian || studentUser.guardian;
        studentUser.educational_qualification = application.educational_qualification || studentUser.educational_qualification;
        if (application.student_photo && !studentUser.profile_photo) {
          studentUser.profile_photo = application.student_photo;
        }
        studentUser.payment_info = {
          total_fee: application.total_course_fee || 0,
          amount_paid: application.amount_paid || 0,
          payment_status: application.payment_status || 'pending',
          payment_method: application.payment_method || 'physical_pay',
          payment_slip: application.payment_slip || '',
          receipt_number: `REC-${Date.now().toString().slice(-6)}`,
          last_updated: new Date()
        };
        await studentUser.save();
      } else {
        indexNumber = await generateUniqueIndexNumber();
        studentUser = await User.create({
          name: application.full_name,
          email: application.email.toLowerCase(),
          phone: application.phone,
          nic: application.nic_number,
          date_of_birth: application.date_of_birth,
          gender: application.gender,
          address: application.address,
          guardian: application.guardian,
          educational_qualification: application.educational_qualification,
          profile_photo: application.student_photo,
          payment_info: {
            total_fee: application.total_course_fee || 0,
            amount_paid: application.amount_paid || 0,
            payment_status: application.payment_status || 'pending',
            payment_method: application.payment_method || 'physical_pay',
            payment_slip: application.payment_slip || '',
            receipt_number: `REC-${Date.now().toString().slice(-6)}`,
            last_updated: new Date()
          },
          index_number: indexNumber,
          registration_number: regNumber,
          password_hash,
          role: 'student',
          is_active: true,
          must_change_password: true,
          temp_password_expires_at
        });
      }

      application.registration_number = regNumber;
      application.generated_index_number = indexNumber;

      generatedCredentials = {
        registration_number: regNumber,
        index_number: indexNumber,
        temp_password: tempPassword,
        email: application.email,
        student_id: studentUser._id
      };

      // Auto-enroll into active batch(es)
      try {
        const coursesToEnroll = (assigned_course_ids && assigned_course_ids.length > 0)
          ? assigned_course_ids
          : ((application.course_ids && application.course_ids.length > 0)
              ? application.course_ids.map((c: any) => c._id || c)
              : [application.course_id]);

        for (const targetCourseId of coursesToEnroll) {
          const activeBatch = await Batch.findOne({ course_id: targetCourseId }).sort({ createdAt: -1 });
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
        }
      } catch (enrollErr) {
        console.warn('Auto enrollment warning:', enrollErr);
      }

      // Send official approval credentials email via Nodemailer
      try {
        const emailResult = await sendApprovalEmail({
          to: application.email,
          name: application.full_name,
          registrationNumber: regNumber,
          temporaryPassword: tempPassword
        });
        emailSent = emailResult.success;
        application.approval_email_sent = true;
        application.approval_email_sent_at = new Date();
        application.approval_email_error = undefined;
      } catch (mailErr: any) {
        console.error('Failed to send approval email via Nodemailer:', mailErr);
        emailSent = false;
        emailError = mailErr?.message || String(mailErr);
        application.approval_email_sent = false;
        application.approval_email_error = emailError;
      }
    }

    await application.save();

    // Send instant notification if student account exists
    try {
      const matchingUser = await User.findOne({ email: application.email.toLowerCase() });
      if (matchingUser) {
        await sendNotification({
          userIds: [matchingUser._id],
          title: `Application ${status.toUpperCase()}`,
          message: status === 'approved'
            ? `Congratulations! Your TVTI course application has been APPROVED. Reg No: ${regNumber || 'Assigned'}.`
            : `Your TVTI application status has been updated to: ${status}.`,
          type: 'application_update',
          relatedId: application._id,
          link: '/profile'
        });
      }
    } catch (notifErr) {
      console.warn('In-app notification warning:', notifErr);
    }

    res.json({
      success: true,
      message: `Application marked as ${status}${status === 'approved' ? (emailSent ? ' and credentials sent via email' : ' but approval email delivery failed') : ''}`,
      application,
      registration_number: regNumber,
      email_sent: emailSent,
      email_error: emailError,
      credentials: generatedCredentials
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Server error updating application status' });
  }
};
