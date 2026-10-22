import express from 'express';
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

router.get('/verify', verifyCertificate);
router.post('/verify', verifyCertificate);
router.post('/request-otp', requestCertificateOtp);
router.post('/send-otp', requestCertificateOtp);
router.post('/verify-otp', verifyCertificateOtp);

export default router;
