import { Request, Response } from 'express';
import PaymentSlip from '../models/PaymentSlip';
import User from '../models/User';
import Application from '../models/Application';
import { sendNotification } from '../services/notificationService';
import { sendRawEmail } from '../services/emailService';
import { reviewPayment, recordConfirmedPayment } from '../services/paymentReview';
import { PracticalError } from '../services/practicalScheduling';
import { summarizePayment, paymentAmount, paymentMethods, paymentBalanceMessage } from '../utils/paymentSummary';
import { saveBufferToGridFS } from '../services/fileStorage';

// POST /api/students/payments/upload-slip
export const uploadPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = (req as any).user?._id;
    const { amount, payment_method, notes, slip_url } = req.body;

    const paidAmount = paymentAmount(amount);
    if (paidAmount === null) {
      res.status(400).json({ message: 'Enter a positive payment amount with at most two decimal places.' });
      return;
    }
    if (!paymentMethods.includes(payment_method || 'bank_transfer')) { res.status(400).json({ message: 'Select a valid payment method.' }); return; }

    if (!req.file && !slip_url) {
      res.status(400).json({ message: 'Payment slip photo or document is required' });
      return;
    }

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      res.status(404).json({ message: 'Student account not found' });
      return;
    }

    if (req.file && (!['image/png', 'image/jpeg', 'application/pdf'].includes(req.file.mimetype) || req.file.size > 8 * 1024 * 1024)) {
      res.status(400).json({ message: 'Choose a JPG, PNG or PDF receipt no larger than 8 MB.' }); return;
    }
    const uploadedSlipUrl = req.file ? `/api/files/${await saveBufferToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)}` : slip_url;

    const newSlip = await PaymentSlip.create({
      student_id: studentId,
      amount: paidAmount,
      payment_method: payment_method || 'bank_transfer',
      slip_url: uploadedSlipUrl,
      receipt_mime_type: req.file?.mimetype,
      notes: notes || '',
      status: 'pending',
    });

    // Uploading evidence does not change confirmed payments or the student's fee.
    let notification_sent = true;
    // Notify Admins about new payment slip submission
    try { await sendNotification({
      role: 'admin',
      title: 'New Payment Slip Uploaded',
      message: `Student "${student.name}" uploaded a new payment slip of LKR ${Number(amount).toLocaleString()} for review.`,
      type: 'payment',
      relatedId: newSlip._id,
      link: '/admin/users',
    }); } catch { notification_sent = false; }

    res.status(201).json({
      message: 'Payment slip uploaded successfully and submitted for admin verification.',
      slip: newSlip,
      summary: summarizePayment(student.payment_info, await PaymentSlip.find({ student_id: studentId })),
      notification_sent,
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
    const student = await User.findById(studentId).select('payment_info name email index_number registration_number');
    if (!student) {
      res.status(404).json({ message: 'Student account not found' });
      return;
    }

    const slips = await PaymentSlip.find({ student_id: studentId }).sort({ createdAt: -1 });

    res.json({
      summary: summarizePayment(student.payment_info, slips),
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
      .select('name email phone index_number registration_number nic profile_photo payment_info createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const formattedList = await Promise.all(
      students.map(async (s: any) => {
        const slips = await PaymentSlip.find({ student_id: s._id }).select('amount status');
        const summary = summarizePayment(s.payment_info, slips);

        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          index_number: s.index_number,
          registration_number: s.registration_number,
          nic: s.nic,
          profile_photo: s.profile_photo,
          ...summary,
          payment_method: s.payment_info?.payment_method || 'bank_transfer',
          has_registration_slip: Boolean(s.payment_info?.payment_slip),
          registration_slip_url: s.payment_info?.payment_slip || '',

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

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        index_number: student.index_number,
        registration_number: student.registration_number,
        nic: student.nic,
        address: student.address,
        profile_photo: student.profile_photo,
      },
      summary: summarizePayment(student.payment_info, slips),
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
  const message = (approved ? 'Your payment of LKR ' + slip.amount.toLocaleString() + ' has been verified and credited to your account.' : 'Your payment receipt was rejected: ' + slip.rejection_reason) + '\n' + paymentBalanceMessage(student.payment_info);
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
    res.json({ message: 'Payment approved and credited to the student.', slip: result.slip, summary: summarizePayment(result.student.payment_info) });
  } catch (error) { paymentError(error, res); }
};
export const rejectPaymentSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await reviewPayment(String(req.params.slipId), false, (req as any).user?._id, req.body.reason);
    await notifyPaymentReview(result.student, result.slip, false);
    res.json({ message: 'Payment receipt rejected.', slip: result.slip, summary: summarizePayment(result.student.payment_info) });
  } catch (error) { paymentError(error, res); }
};
export const recordManualPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await recordConfirmedPayment(String(req.params.studentId), (req as any).user?._id, req.body);
    await notifyPaymentReview(result.student, result.slip, true);
    res.status(201).json({ message: 'Payment recorded successfully.', slip: result.slip, summary: summarizePayment(result.student.payment_info) });
  } catch (error) { paymentError(error, res); }
};
