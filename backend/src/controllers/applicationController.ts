import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Application from '../models/Application';
import User from '../models/User';
import Course from '../models/Course';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import { sendNotification } from '../services/notificationService';
import { isEmailVerified, consumeEmailVerification } from '../services/otpService';
import { sendApplicationSubmissionEmail, sendApprovalCredentialsEmail } from '../services/emailService';

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

    // If an un-approved application with this email already exists in pending status, clean it up so the new submission replaces it seamlessly
    await Application.deleteMany({
      email: email.toLowerCase().trim(),
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
    if (educational_qualification && (educational_qualification.highest_level || educational_qualification.institute_name)) {
      eduData = {
        highest_level: educational_qualification.highest_level || 'O/L Completed',
        grade_level: educational_qualification.grade_level ? educational_qualification.grade_level.trim() : undefined,
        institute_name: educational_qualification.institute_name ? educational_qualification.institute_name.trim() : undefined
      };
    } else if (req.body.education_level || req.body.school_name || req.body.highest_level) {
      eduData = {
        highest_level: req.body.education_level || req.body.highest_level || 'O/L Completed',
        grade_level: req.body.grade_level ? req.body.grade_level.trim() : undefined,
        institute_name: req.body.school_name ? req.body.school_name.trim() : (req.body.institute_name ? req.body.institute_name.trim() : undefined)
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

    if (status === 'approved') {
      const orConditions: any[] = [{ email: application.email.toLowerCase() }];
      if (application.nic_number && application.nic_number.trim()) {
        orConditions.push({ nic: application.nic_number.trim() });
      }
      let studentUser = await User.findOne({ $or: orConditions });

      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const tempPassword = `TVTI#${randomDigits}`;
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(tempPassword, salt);
      const temp_password_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      let indexNumber = '';

      if (studentUser) {
        if (!studentUser.index_number) {
          studentUser.index_number = await generateUniqueIndexNumber();
        }
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

      // Send official email asynchronously (non-blocking)
      sendApprovalCredentialsEmail({
        to: application.email,
        studentName: application.full_name,
        indexNumber: indexNumber,
        tempPassword: tempPassword
      }).catch(emailErr => {
        console.warn('Warning: Failed to send approval credentials email:', emailErr);
      });
    }

    await application.save();

    // Send instant notification
    const matchingUser = await User.findOne({ email: application.email.toLowerCase() });
    if (matchingUser) {
      await sendNotification({
        userIds: [matchingUser._id],
        title: `Application ${status.toUpperCase()}`,
        message: status === 'approved'
          ? `Your TVTI course application has been APPROVED.\nRegistration No: ${application.generated_index_number || matchingUser.index_number}\nTemporary Password: ${generatedCredentials?.temp_password || 'Issued'}\nPlease log in to set your permanent password.`
          : `Your TVTI application status has been updated to: ${status}.`,
        type: 'application_update',
        relatedId: application._id,
        link: '/profile'
      });
    }

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
