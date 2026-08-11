import express from 'express';
import { verifyCertificate } from '../controllers/certificateController';

const router = express.Router();

// Public endpoint for certificate and student credential verification
router.get('/verify', verifyCertificate);

export default router;
