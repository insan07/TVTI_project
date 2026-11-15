import express from 'express';
import rateLimit from 'express-rate-limit';
import { emailRequestLimiter, otpAttemptLimiter, publicSubmissionLimiter } from '../middleware/publicRateLimits';
import { login, register, forgotPassword, verifyResetOtp, resendResetOtp, resetPassword, sendOtpHandler, verifyOtpHandler, checkEligibility } from '../controllers/authController';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login requests per windowMs
  message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes' },
});

router.post('/login', loginLimiter, login);
router.post('/register', publicSubmissionLimiter, register);
router.post('/check-eligibility', publicSubmissionLimiter, checkEligibility);
router.post('/send-otp', emailRequestLimiter, sendOtpHandler);
router.post('/verify-otp', otpAttemptLimiter, verifyOtpHandler);
router.post('/forgot-password', emailRequestLimiter, forgotPassword);
router.post('/verify-reset-otp', otpAttemptLimiter, verifyResetOtp);
router.post('/resend-reset-otp', emailRequestLimiter, resendResetOtp);
router.post('/reset-password', otpAttemptLimiter, resetPassword);

export default router;
