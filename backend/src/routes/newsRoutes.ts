import express from 'express';
import { getPublicNews, createNews, deleteNews } from '../controllers/newsController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

// Public endpoint for website
router.get('/', getPublicNews);

// Protected Admin endpoints
router.post('/', protect, checkRole(['admin']), createNews);
router.delete('/:id', protect, checkRole(['admin']), deleteNews);

export default router;
