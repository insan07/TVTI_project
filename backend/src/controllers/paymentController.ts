import { Request, Response } from 'express';
import PaymentSlip from '../models/PaymentSlip';
import User from '../models/User';
import Application from '../models/Application';
import { sendNotification } from '../services/notificationService';
import { sendRawEmail } from '../services/emailService';
import { reviewPayment, recordConfirmedPayment } from '../services/paymentReview';
import { PracticalError } from '../services/practicalScheduling';

// POST /api/students/payments/upload-slip
export const uploadPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = (req as any).user?._id;
    const { amount, payment_method, notes, slip_url } = req.body;

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
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
      link: '/admin/users',
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

    const totalFee = student.payment_info?.total_fee ?? 25000;
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
        const totalFee = s.payment_info?.total_fee ?? 25000;
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
          remaining_balance: isFullySettled ? 0 : remaining,
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
      registrationApp = await Application.findOne({ email: student.email }).sort({ createdAt: -1 }).select('payment_method payment_slip payment_status createdAt').lean();
    }

    const totalFee = student.payment_info?.total_fee ?? 25000;
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
        remaining_balance: isFullySettled ? 0 : remainingBalance,
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

// Deliver acknowledgements after the payment and balance have committed together.
async function notifyPaymentReview(student: any, slip: any, approved: boolean) {
  const message = approved ? 'Your payment of LKR ' + slip.amount.toLocaleString() + ' has been verified and credited to your account.' : 'Your payment receipt was rejected: ' + slip.rejection_reason;
  try { await sendNotification({ userIds: [String(student._id)], title: approved ? 'Payment approved' : 'Payment receipt rejected', message, type: 'payment', relatedId: slip._id, link: '/profile' }); } catch { console.warn('Payment notification could not be delivered.'); }
  try { if (student.email) await sendRawEmail(student.email, approved ? 'TVTI - Payment approved' : 'TVTI - Payment receipt rejected', 'Dear ' + student.name + ',\n\n' + message); } catch { console.warn('Payment email could not be delivered.'); }
}
function paymentError(error: any, res: Response) {
  res.status(error instanceof PracticalError ? error.status : 500).json({ message: error instanceof PracticalError ? error.message : 'The payment could not be saved. Please try again.' });
}
export const verifyPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await reviewPayment(String(req.params.slipId), true, (req as any).user?._id);
    await notifyPaymentReview(result.student, result.slip, true);
    res.json({ message: 'Payment approved and credited to the student.', slip: result.slip });
  } catch (error) { paymentError(error, res); }
};
export const rejectPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await reviewPayment(String(req.params.slipId), false, (req as any).user?._id, req.body.reason);
    await notifyPaymentReview(result.student, result.slip, false);
    res.json({ message: 'Payment receipt rejected.', slip: result.slip });
  } catch (error) { paymentError(error, res); }
};
export const recordManualPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await recordConfirmedPayment(String(req.params.studentId), (req as any).user?._id, req.body);
    try { await sendNotification({ userIds: [String(result.student._id)], title: 'Payment received', message: 'A payment of LKR ' + result.slip.amount.toLocaleString() + ' was recorded for your account.', type: 'payment', relatedId: result.slip._id, link: '/profile' }); } catch { console.warn('Payment notification could not be delivered.'); }
    res.status(201).json({ message: 'Payment recorded successfully.', slip: result.slip });
  } catch (error) { paymentError(error, res); }
};
