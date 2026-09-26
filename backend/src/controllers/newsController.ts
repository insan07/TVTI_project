import { Request, Response } from 'express';
import News from '../models/News';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/news — Public endpoint for website home page news
export const getPublicNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const newsItems = await News.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(newsItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching news' });
  }
};

// POST /api/news — Protected Admin endpoint to post a website news article
export const createNews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category, summary, message, content, image_url } = req.body;

    const newsContent = content || message;

    if (!title || !newsContent) {
      res.status(400).json({ message: 'Title and content/message are required' });
      return;
    }

    const news = await News.create({
      title,
      category: category || 'NEWS',
      summary: summary || newsContent.substring(0, 150),
      content: newsContent,
      image_url: image_url || '',
      posted_by: req.user._id,
      published: true,
    });

    res.status(201).json(news);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ message: 'Server error creating news article' });
  }
};

// DELETE /api/news/:id — Protected Admin endpoint to delete a news article
export const deleteNews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      res.status(404).json({ message: 'News article not found' });
      return;
    }

    await news.deleteOne();
    res.json({ message: 'News article deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting news article' });
  }
};
