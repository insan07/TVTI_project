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
import { sendApplicationSubmissionEmail, sendApprovalEmail, sendRejectionEmail } from '../services/emailService';

import { approveStudentApplication, regenerateApprovedApplicationCredentials } from '../services/studentAdmissions';
import { PracticalError, practicalMutation } from '../services/practicalScheduling';
import { generateTemporaryPassword, generateUniqueIndexNumber, generateUniqueRegistrationNumber } from '../utils/admissionIdentifiers';
export { generateTemporaryPassword, generateUniqueIndexNumber, generateUniqueRegistrationNumber } from '../utils/admissionIdentifiers';

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

    // If an un-approved application with this email already exists in pending or rejected status, clean it up so the new submission replaces it seamlessly
    await Application.deleteMany({
      email: cleanEmail,
      status: { $in: ['pending', 'rejected'] }
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

    // Notify Admins about the new student application
    await sendNotification({
      role: 'admin',
      title: 'New Course Application 📄',
      message: `${application.full_name} submitted a new course application.`,
      type: 'new_application',
      relatedId: application._id,
      link: '/admin/users'
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
    const status = req.body.status;
    if (!['pending', 'contacted', 'paid', 'approved', 'rejected'].includes(status) || !mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Select a valid application and status.' }); return;
    }
    let result: any;
    if (status === 'approved') result = await approveStudentApplication(String(req.params.id), req.body);
    else result = await practicalMutation(async session => {
      const application = await Application.findById(req.params.id).session(session);
      if (!application) throw new PracticalError(404, 'Application not found.');
      application.status = status;
      if (status === 'rejected') application.rejection_reason = String(req.body.rejection_reason || '').trim() || 'Application details did not meet entry requirements.';
      await application.save({ session });
      return { application };
    });
    const application = result.application;
    let emailSent = false, emailError: string | undefined;
    if (status === 'approved' || status === 'rejected') {
      try {
        const mail = status === 'approved' ? await sendApprovalEmail({ to: application.email, name: application.full_name, registrationNumber: result.credentials.registration_number, temporaryPassword: result.credentials.temp_password })
          : await sendRejectionEmail({ to: application.email, name: application.full_name, rejectionReason: application.rejection_reason });
        emailSent = !!mail.success;
        if (!emailSent) emailError = 'Email delivery failed.';
      } catch (error: any) { emailError = error.message || 'Email delivery failed.'; }
      if (status === 'approved') await Application.findByIdAndUpdate(application._id, { approval_email_sent: emailSent, approval_email_sent_at: emailSent ? new Date() : undefined, approval_email_error: emailError });
    }
    try {
      const student = result.student || await User.findOne({ email: application.email.toLowerCase(), role: 'student' });
      if (student) await sendNotification({ userIds: [String(student._id)], title: status === 'approved' ? 'Application approved' : 'Application updated', message: status === 'approved' ? 'Your application is approved and your selected batches are assigned.' : `Your application status is ${status}.`, type: 'application_update', relatedId: application._id, link: '/profile' });
    } catch (error) { console.warn('Application notification could not be delivered.'); }
    res.json({ success: true, message: status === 'approved' ? 'Application approved and batches assigned.' : `Application marked as ${status}.`, application, credentials: result.credentials || null, assigned_batch_ids: result.batches?.map((batch: any) => batch._id), email_sent: emailSent, email_error: emailError });
  } catch (error: any) {
    res.status(error instanceof PracticalError ? error.status : error.code === 11000 ? 409 : 500).json({ message: error instanceof PracticalError ? error.message : error.code === 11000 ? 'The student account already exists. Refresh and try again.' : 'Application update failed. Please try again.' });
  }
};

export const resendApplicationCredentials = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await regenerateApprovedApplicationCredentials(String(req.params.id));
    let emailSent = false;
    try {
      const mail = await sendApprovalEmail({ to: result.student.email, name: result.student.name, registrationNumber: result.credentials.registration_number, temporaryPassword: result.credentials.temp_password });
      emailSent = !!mail.success;
    } catch { /* Return the generated credentials so the admin can still save them. */ }
    await Application.findByIdAndUpdate(result.application._id, {
      approval_email_sent: emailSent,
      approval_email_sent_at: emailSent ? new Date() : undefined,
      approval_email_error: emailSent ? undefined : 'Email delivery failed.'
    });
    res.json({ success: true, message: emailSent ? 'New credentials emailed to the student.' : 'New credentials generated, but email delivery failed.', credentials: result.credentials, email_sent: emailSent });
  } catch (error: any) {
    res.status(error instanceof PracticalError ? error.status : 500).json({ message: error instanceof PracticalError ? error.message : 'Credentials could not be resent. Please try again.' });
  }
};

export const deleteApplicationCompletely = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      res.status(404).json({ message: 'Application record not found' });
      return;
    }

    await Application.findByIdAndDelete(id);
    res.json({ success: true, message: 'Application record permanently deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ message: 'Server error during application deletion' });
  }
};
