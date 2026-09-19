import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, forgotPassword, verifyResetOtp, resendResetOtp, resetPassword, sendOtpHandler, verifyOtpHandler, checkEligibility } from '../controllers/authController';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login requests per windowMs
  message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes' },
});

router.post('/login', loginLimiter, login);
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
