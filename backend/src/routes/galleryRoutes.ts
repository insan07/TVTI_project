import express from 'express';
import { getGalleryItems, addGalleryItem, deleteGalleryItem } from '../controllers/galleryController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

// Public endpoint
router.get('/', getGalleryItems);

// Protected Admin endpoints
router.post('/', protect, checkRole(['admin']), addGalleryItem);
router.delete('/:id', protect, checkRole(['admin']), deleteGalleryItem);

export default router;
