import { Request, Response } from 'express';
import PaymentSlip from '../models/PaymentSlip';
import User from '../models/User';
import Application from '../models/Application';
import { sendNotification } from '../services/notificationService';
import { sendRawEmail } from '../services/emailService';

// POST /api/students/payments/upload-slip
export const uploadPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = (req as any).user?._id;
    const { amount, payment_method, notes, slip_url } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: 'Valid payment amount is required' });
      return;
    }

    const uploadedSlipUrl = req.file ? `/uploads/${req.file.filename}` : (slip_url || '');
    if (!uploadedSlipUrl) {
      res.status(400).json({ message: 'Payment slip photo or document is required' });
      return;
    }

    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ message: 'Student account not found' });
      return;
    }

    const newSlip = await PaymentSlip.create({
      student_id: studentId,
      amount: Number(amount),
      payment_method: payment_method || 'bank_transfer',
      slip_url: uploadedSlipUrl,
      notes: notes || '',
      status: 'pending',
    });

    // Update student payment status if currently unpaid
    if (!student.payment_info) {
      student.payment_info = {
        total_fee: 25000,
        amount_paid: 0,
        payment_status: 'pending',
        payment_method: payment_method || 'bank_transfer',
        last_updated: new Date(),
      };
    } else {
      student.payment_info.last_updated = new Date();
      if (student.payment_info.payment_status === 'unpaid' || !student.payment_info.payment_status) {
        student.payment_info.payment_status = 'pending';
      }
    }
    await student.save();

    // Notify Admins about new payment slip submission
    await sendNotification({
      role: 'admin',
      title: 'New Payment Slip Uploaded',
      message: `Student "${student.name}" uploaded a new payment slip of LKR ${Number(amount).toLocaleString()} for review.`,
      type: 'payment',
      relatedId: newSlip._id,
    });

    res.status(201).json({
      message: 'Payment slip uploaded successfully and submitted for admin verification.',
      slip: newSlip,
    });
  } catch (error: any) {
    console.error('uploadPaymentSlip error:', error);
    res.status(500).json({ message: 'Failed to upload payment slip' });
  }
};

// GET /api/students/payments/my-slips
export const getMyPaymentSlips = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = (req as any).user?._id;
    const student = await User.findById(studentId).select('payment_info name email index_number');
    if (!student) {
      res.status(404).json({ message: 'Student account not found' });
      return;
    }

    const slips = await PaymentSlip.find({ student_id: studentId }).sort({ createdAt: -1 });

    const totalFee = student.payment_info?.total_fee || 25000;
    const amountPaid = student.payment_info?.amount_paid || 0;
    const balance = Math.max(0, totalFee - amountPaid);
    const paymentStatus = student.payment_info?.payment_status || (amountPaid >= totalFee ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'pending');

    res.json({
      summary: {
        total_fee: totalFee,
        amount_paid: amountPaid,
        remaining_balance: balance,
        payment_status: paymentStatus,
      },
      slips,
    });
  } catch (error: any) {
    console.error('getMyPaymentSlips error:', error);
    res.status(500).json({ message: 'Failed to fetch payment slips' });
  }
};

// GET /api/admin/payments
export const getAdminPaymentList = async (req: Request, res: Response): Promise<void> => {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email phone index_number nic profile_photo payment_info createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const formattedList = await Promise.all(
      students.map(async (s: any) => {
        const totalFee = s.payment_info?.total_fee || 25000;
        const amountPaid = s.payment_info?.amount_paid || 0;
        const remaining = Math.max(0, totalFee - amountPaid);

        const isFullySettled = amountPaid >= totalFee || s.payment_info?.payment_status === 'paid' || s.payment_info?.payment_status === 'waived';
        const category = isFullySettled ? 'completed' : 'pending';

        const pendingSlipsCount = await PaymentSlip.countDocuments({ student_id: s._id, status: 'pending' });
        const totalSlipsCount = await PaymentSlip.countDocuments({ student_id: s._id });

        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          index_number: s.index_number,
          nic: s.nic,
          profile_photo: s.profile_photo,
          total_fee: totalFee,
          amount_paid: amountPaid,
          remaining_balance: remaining,
          payment_status: isFullySettled ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'pending',
          payment_method: s.payment_info?.payment_method || 'bank_transfer',
          has_registration_slip: Boolean(s.payment_info?.payment_slip),
          registration_slip_url: s.payment_info?.payment_slip || '',
          pending_slips_count: pendingSlipsCount,
          total_slips_count: totalSlipsCount,
          category,
        };
      })
    );

    res.json(formattedList);
  } catch (error: any) {
    console.error('getAdminPaymentList error:', error);
    res.status(500).json({ message: 'Failed to fetch payment records' });
  }
};

// GET /api/admin/payments/:studentId/dossier
export const getStudentPaymentDossier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId).select('-password_hash').lean();
    if (!student) {
      res.status(404).json({ message: 'Student record not found' });
      return;
    }

    const slips = await PaymentSlip.find({ student_id: studentId })
      .populate('verified_by', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Check if initial registration application has a slip
    let registrationApp: any = null;
    if (student.email) {
      registrationApp = await Application.findOne({ email: student.email }).select('payment_method payment_slip payment_status createdAt').lean();
    }

    const totalFee = student.payment_info?.total_fee || 25000;
    const amountPaid = student.payment_info?.amount_paid || 0;
    const remainingBalance = Math.max(0, totalFee - amountPaid);
    const isFullySettled = amountPaid >= totalFee || student.payment_info?.payment_status === 'paid' || student.payment_info?.payment_status === 'waived';

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        index_number: student.index_number,
        nic: student.nic,
        address: student.address,
        profile_photo: student.profile_photo,
      },
      summary: {
        total_fee: totalFee,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
        payment_status: isFullySettled ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'pending',
        category: isFullySettled ? 'completed' : 'pending',
      },
      registration_info: registrationApp
        ? {
            payment_method: registrationApp.payment_method,
            payment_slip: registrationApp.payment_slip,
            payment_status: registrationApp.payment_status,
            createdAt: registrationApp.createdAt,
          }
        : null,
      slips,
    });
  } catch (error: any) {
    console.error('getStudentPaymentDossier error:', error);
    res.status(500).json({ message: 'Failed to fetch student payment dossier' });
  }
};

// PUT /api/admin/payments/slips/:slipId/verify
export const verifyPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user?._id;
    const { slipId } = req.params;

    const slip = await PaymentSlip.findById(slipId);
    if (!slip) {
      res.status(404).json({ message: 'Payment slip not found' });
      return;
    }

    if (slip.status === 'verified') {
      res.status(400).json({ message: 'This payment slip is already verified' });
      return;
    }

    slip.status = 'verified';
    slip.verified_by = adminId;
    slip.verified_at = new Date();
    await slip.save();

    // Update student amount_paid and payment_status
    const student = await User.findById(slip.student_id);
    if (student) {
      if (!student.payment_info) {
        student.payment_info = { total_fee: 25000, amount_paid: 0, payment_status: 'pending' };
      }

      const newAmountPaid = (student.payment_info.amount_paid || 0) + slip.amount;
      const totalFee = student.payment_info.total_fee || 25000;
      const newStatus = newAmountPaid >= totalFee ? 'paid' : 'partially_paid';

      student.payment_info.amount_paid = newAmountPaid;
      student.payment_info.payment_status = newStatus;
      student.payment_info.last_updated = new Date();
      await student.save();

      // Send notification & email to student
      await sendNotification({
        userIds: [student._id.toString()],
        title: 'Payment Slip Verified & Approved ✅',
        message: `Your payment slip of LKR ${slip.amount.toLocaleString()} has been verified. Total amount settled: LKR ${newAmountPaid.toLocaleString()}/${totalFee.toLocaleString()}.`,
        type: 'payment',
        relatedId: slip._id,
      });

      if (student.email) {
        const subject = 'TVTI VTI - Payment Receipt Verified';
        const body = `Dear ${student.name},\n\nYour submitted payment slip of LKR ${slip.amount.toLocaleString()} has been verified and credited to your account.\n\nTotal Paid: LKR ${newAmountPaid.toLocaleString()}\nRemaining Balance: LKR ${Math.max(0, totalFee - newAmountPaid).toLocaleString()}\n\nThank you,\nTwintec Vocational Training Institute`;
        sendRawEmail(student.email, subject, body).catch((e: any) => console.warn('Payment verify email failed:', e));
      }
    }

    res.json({ message: 'Payment slip verified successfully', slip });
  } catch (error: any) {
    console.error('verifyPaymentSlip error:', error);
    res.status(500).json({ message: 'Failed to verify payment slip' });
  }
};

// PUT /api/admin/payments/slips/:slipId/reject
export const rejectPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slipId } = req.params;
    const { reason } = req.body;

    const slip = await PaymentSlip.findById(slipId);
    if (!slip) {
      res.status(404).json({ message: 'Payment slip not found' });
      return;
    }

    slip.status = 'rejected';
    slip.rejection_reason = reason || 'Verification failed. Please re-upload a clear slip.';
    await slip.save();

    const student = await User.findById(slip.student_id);
    if (student) {
      await sendNotification({
        userIds: [student._id.toString()],
        title: 'Payment Slip Rejected ❌',
        message: `Your payment slip of LKR ${slip.amount.toLocaleString()} was rejected: ${slip.rejection_reason}`,
        type: 'payment',
        relatedId: slip._id,
      });

      if (student.email) {
        const subject = 'TVTI VTI - Payment Slip Verification Status';
        const body = `Dear ${student.name},\n\nYour submitted payment slip of LKR ${slip.amount.toLocaleString()} could not be verified.\nReason: ${slip.rejection_reason}\n\nPlease log in to your profile to upload a revised payment slip.\n\nThank you,\nTwintec Vocational Training Institute`;
        sendRawEmail(student.email, subject, body).catch((e: any) => console.warn('Payment reject email failed:', e));
      }
    }

    res.json({ message: 'Payment slip rejected', slip });
  } catch (error: any) {
    console.error('rejectPaymentSlip error:', error);
    res.status(500).json({ message: 'Failed to reject payment slip' });
  }
};

// POST /api/admin/payments/:studentId/record-manual
export const recordManualPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user?._id;
    const { studentId } = req.params;
    const { amount, payment_method, notes } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: 'Valid payment amount is required' });
      return;
    }

    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ message: 'Student record not found' });
      return;
    }

    const slip = await PaymentSlip.create({
      student_id: studentId,
      amount: Number(amount),
      payment_method: payment_method || 'physical_cash',
      notes: notes || 'Direct counter payment recorded by admin',
      status: 'verified',
      verified_by: adminId,
      verified_at: new Date(),
    });

    if (!student.payment_info) {
      student.payment_info = { total_fee: 25000, amount_paid: 0, payment_status: 'pending' };
    }

    const newAmountPaid = (student.payment_info.amount_paid || 0) + Number(amount);
    const totalFee = student.payment_info.total_fee || 25000;
    const newStatus = newAmountPaid >= totalFee ? 'paid' : 'partially_paid';

    student.payment_info.amount_paid = newAmountPaid;
    student.payment_info.payment_status = newStatus;
    student.payment_info.last_updated = new Date();
    await student.save();

    await sendNotification({
      userIds: [student._id.toString()],
      title: 'Payment Received ✅',
      message: `A cash/counter payment of LKR ${Number(amount).toLocaleString()} was recorded for your account. Total settled: LKR ${newAmountPaid.toLocaleString()}/${totalFee.toLocaleString()}.`,
      type: 'payment',
      relatedId: slip._id,
    });

    res.status(201).json({ message: 'Payment recorded successfully', slip });
  } catch (error: any) {
    console.error('recordManualPayment error:', error);
    res.status(500).json({ message: 'Failed to record manual payment' });
  }
};
