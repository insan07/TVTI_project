import { Request, Response } from 'express';
import Gallery from '../models/Gallery';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/gallery — Public endpoint to fetch gallery items (filtered by type optional)
export const getGalleryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, category } = req.query;
    const query: any = {};
    if (type) query.type = type;
    if (category && category !== 'All') query.category = category;

    const items = await Gallery.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/admin/gallery — Admin endpoint to create a new photo/video gallery item
export const addGalleryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category, type, url, description, youtubeId } = req.body;

    if (!title || !url || !type) {
      res.status(400).json({ message: 'Title, url, and type are required' });
      return;
    }

    let finalYoutubeId = youtubeId;
    if (type === 'video' && !finalYoutubeId && url) {
      // Extract youtube id from url if present
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) {
        finalYoutubeId = match[1];
      }
    }

    const item = await Gallery.create({
      title,
      category: category || (type === 'video' ? 'Practical Sessions' : 'Workshops & Labs'),
      type,
      url,
      description: description || '',
      youtubeId: finalYoutubeId || '',
      posted_by: req.user._id,
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/gallery/:id — Admin endpoint to delete a gallery item
export const deleteGalleryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Gallery item not found' });
      return;
    }

    await item.deleteOne();
    res.json({ message: 'Gallery item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
