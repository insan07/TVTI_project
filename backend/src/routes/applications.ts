import express from 'express';
import { submitApplication, getApplications } from '../controllers/applicationController';

const router = express.Router();

// Public endpoint for students submitting course applications
router.post('/', submitApplication);

// Endpoint for fetching applications
router.get('/', getApplications);

export default router;
