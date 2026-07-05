import express from 'express';
import { getMe, updateProfile, changePassword, updatePushToken } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.use(protect); // All routes here require auth

router.get('/me', getMe);
router.put('/profile', upload.single('profile_photo'), updateProfile);
router.put('/change-password', changePassword);
router.put('/push-token', updatePushToken);

export default router;
