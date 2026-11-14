import mongoose from 'mongoose';
import PaymentSlip from '../models/PaymentSlip';
import User from '../models/User';
import { practicalMutation, PracticalError } from './practicalScheduling';
import { summarizePayment, paymentAmount, paymentMethods } from '../utils/paymentSummary';

export async function reviewPayment(slipId: string, approved: boolean, adminId: any, reason?: string) {
  if (!mongoose.isValidObjectId(slipId)) throw new PracticalError(400, 'Invalid payment slip.');
  return practicalMutation(async session => {
    const slip = await PaymentSlip.findById(slipId).session(session);
    if (!slip) throw new PracticalError(404, 'Payment slip not found.');
    if (slip.status !== 'pending') throw new PracticalError(409, 'This payment slip has already been reviewed.');
    const student = await User.findOne({ _id: slip.student_id, role: 'student' }).session(session);
    if (!student) throw new PracticalError(404, 'Student record not found.');
    if (paymentAmount(slip.amount) === null) throw new PracticalError(400, 'Enter a positive payment amount with at most two decimal places.');
    slip.status = approved ? 'verified' : 'rejected';
    slip.verified_by = adminId;
    slip.verified_at = new Date();
    slip.rejection_reason = approved ? undefined : String(reason || '').trim() || 'Verification failed. Please upload a clear receipt.';
    if (approved) {
      student.payment_info ||= { total_fee: 0, amount_paid: 0 };
      student.payment_info.amount_paid = Math.round(((student.payment_info.amount_paid || 0) + slip.amount) * 100) / 100;
      student.payment_info.payment_status = summarizePayment(student.payment_info).payment_status;
      student.payment_info.last_updated = new Date();
      await student.save({ session });
    }
    await slip.save({ session });
    return { slip, student };
  });
}

export async function recordConfirmedPayment(studentId: string, adminId: any, body: any) {
  const amount = paymentAmount(body.amount);
  if (amount === null) throw new PracticalError(400, 'Enter a positive payment amount with at most two decimal places.');
  if (!mongoose.isValidObjectId(studentId)) throw new PracticalError(400, 'Invalid student.');
  const payment_method = body.payment_method || 'physical_cash';
  if (!paymentMethods.includes(payment_method)) throw new PracticalError(400, 'Select a valid payment method.');
  return practicalMutation(async session => {
    const student = await User.findOne({ _id: studentId, role: 'student' }).session(session);
    if (!student) throw new PracticalError(404, 'Student record not found.');
    const [slip] = await PaymentSlip.create([{ student_id: student._id, amount, payment_method, notes: String(body.notes || '').trim() || 'Payment recorded by admin', status: 'verified', verified_by: adminId, verified_at: new Date() }], { session });
    student.payment_info ||= { total_fee: 0, amount_paid: 0 };
    student.payment_info.amount_paid = Math.round(((student.payment_info.amount_paid || 0) + amount) * 100) / 100;
    student.payment_info.payment_status = summarizePayment(student.payment_info).payment_status;
    student.payment_info.last_updated = new Date();
    await student.save({ session });
    return { slip, student };
  });
}
