import express from 'express';
import { login, register, forgotPassword, verifyResetOtp, resendResetOtp, resetPassword, sendOtpHandler, verifyOtpHandler, checkEligibility } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/check-eligibility', checkEligibility);
router.post('/send-otp', sendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/resend-reset-otp', resendResetOtp);
router.post('/reset-password', resetPassword);

router.get('/debug-batch', async (req, res) => {
  const Batch = require('../models/Batch').default;
  const batches = await Batch.find({}).populate('course_id');
  res.json(batches);
});

export default router;
