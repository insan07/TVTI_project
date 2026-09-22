import express from 'express';
import { submitApplication, getApplications } from '../controllers/applicationController';
import { sendOtpHandler, verifyOtpHandler } from '../controllers/authController';

const router = express.Router();

// OTP verification endpoints for course applications
router.post('/send-otp', sendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);

// Public endpoint for students submitting course applications
router.post('/', submitApplication);

// Endpoint for fetching applications
router.get('/', getApplications);

export default router;
