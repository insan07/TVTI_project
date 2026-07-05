import express from 'express';
import { login, register, resetPasswordRequest, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/reset-password', resetPasswordRequest);
router.put('/reset-password/:token', resetPassword);

export default router;
