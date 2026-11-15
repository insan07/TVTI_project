import express from 'express';
import rateLimit from 'express-rate-limit';
import { getMe, updateProfile, changePassword, updatePushToken, sendPasswordChangeOtp, verifyPasswordChangeIdentity } from '../controllers/userController';
import { forceChangePassword } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { imageUpload, validateUploadedImage } from '../middleware/uploadMiddleware';

const router = express.Router();

router.use(protect); // All routes here require auth

const passwordVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  keyGenerator: (req) => String((req as any).user._id),
  message: { message: 'Too many verification attempts. Please try again in 15 minutes.' },
});
const passwordEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  keyGenerator: (req) => String((req as any).user._id),
  message: { message: 'Too many verification emails requested. Please try again in 15 minutes.' },
});

router.get('/me', getMe);
router.put('/profile', imageUpload.single('profile_photo'), validateUploadedImage, updateProfile);
router.put('/change-password', changePassword);
router.post('/password-change-otp', passwordEmailLimiter, sendPasswordChangeOtp);
router.post('/verify-password-change', passwordVerificationLimiter, verifyPasswordChangeIdentity);
router.put('/force-change-password', forceChangePassword);
router.put('/push-token', updatePushToken);
router.post('/push-token', updatePushToken);
router.post('/fcm-token', updatePushToken);

export default router;
