import express from 'express';
import { login, register, resetPasswordRequest, resetPassword, sendOtpHandler, verifyOtpHandler, checkEligibility } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/check-eligibility', checkEligibility);
router.post('/send-otp', sendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);
router.post('/reset-password', resetPasswordRequest);
router.put('/reset-password/:token', resetPassword);

export default router;
