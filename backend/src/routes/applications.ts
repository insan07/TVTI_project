import express from 'express';
import { submitApplication, getApplications } from '../controllers/applicationController';
import { sendOtpHandler, verifyOtpHandler } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';
import { emailRequestLimiter, otpAttemptLimiter, publicSubmissionLimiter } from '../middleware/publicRateLimits';

const router = express.Router();

// OTP verification endpoints for course applications
router.post('/send-otp', emailRequestLimiter, sendOtpHandler);
router.post('/verify-otp', otpAttemptLimiter, verifyOtpHandler);

// Public endpoint for students submitting course applications
router.post('/', publicSubmissionLimiter, submitApplication);

// Endpoint for fetching applications
router.get('/', protect, checkRole(['admin']), getApplications);

export default router;
