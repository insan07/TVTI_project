import express from 'express';
import { submitApplication } from '../controllers/applicationController';

const router = express.Router();

// Public endpoint for students submitting course applications
router.post('/', submitApplication);

export default router;
