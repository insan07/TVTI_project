import express from 'express';
import { emailRequestLimiter, otpAttemptLimiter } from '../middleware/publicRateLimits';
import {
  verifyCertificate,
  searchStudentForVerification,
  requestCertificateOtp,
  verifyCertificateOtp
} from '../controllers/certificateController';

const router = express.Router();

// Public endpoints for certificate and student credential verification with Email OTP
router.get('/search', searchStudentForVerification);
router.post('/search', searchStudentForVerification);

router.get('/verify', emailRequestLimiter, verifyCertificate);
router.post('/verify', emailRequestLimiter, verifyCertificate);
router.post('/request-otp', emailRequestLimiter, requestCertificateOtp);
router.post('/send-otp', emailRequestLimiter, requestCertificateOtp);
router.post('/verify-otp', otpAttemptLimiter, verifyCertificateOtp);

export default router;
