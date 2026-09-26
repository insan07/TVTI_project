import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import dns from 'dns';

// Import Routes
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import adminRoutes from './routes/admin';
import userRoutes from './routes/userRoutes';
import studentRoutes from './routes/students';
import instructorRoutes from './routes/instructors';
import applicationRoutes from './routes/applications';
import certificateRoutes from './routes/certificateRoutes';
import notificationRoutes from './routes/notifications';
import announcementRoutes from './routes/announcements';
import galleryRoutes from './routes/galleryRoutes';
import User from './models/User';
import { getGridFSDownloadStream } from './services/fileStorage';

const app: Application = express();
const PORT = process.env.PORT || 5000;

import path from 'path';

import { corsOptions } from './config/cors';

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
// CORS Configuration with full support for official domains, Vercel deployments, and dev servers
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.path.toLowerCase().endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
  }
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/files/:fileId', (req: Request, res: Response) => {
  try {
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
    const downloadStream = getGridFSDownloadStream(fileId);
    downloadStream.on('file', (file) => {
      const contentType = file.metadata?.contentType || (file.filename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    });
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ message: 'File not found' });
      else res.end();
    });
    downloadStream.pipe(res);
  } catch {
    res.status(400).json({ message: 'Invalid file ID' });
  }
});

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Generous limit for dev & live usage
  message: { success: false, message: 'Too many requests from this IP, please try again later' },
});
app.use('/api', apiLimiter);

// Database Connection — lazy connect for Vercel serverless
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('CRITICAL ERROR: MONGO_URI is not defined. Please set MONGO_URI in environment variables.');
    }
    await mongoose.connect(mongoURI);
    isConnected = true;
    console.log('MongoDB Connected successfully.');

    // Run simple one-time migration to lowercase all user emails
    try {
      const usersWithUpper = await User.find({ email: { $regex: /[A-Z]/ } });
      if (usersWithUpper.length > 0) {
        console.log(`[Migration] Found ${usersWithUpper.length} users with uppercase letters in their email. Lowercasing...`);
        for (const u of usersWithUpper) {
          const oldEmail = u.email;
          u.email = u.email.toLowerCase().trim();
          await u.save();
          console.log(`[Migration] Updated: "${oldEmail}" -> "${u.email}"`);
        }
      }
    } catch (migErr) {
      console.error('[Migration] Email lowercasing failed:', migErr);
    }
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    throw err; // Let the request fail visibly instead of silently proceeding
  }
};

// Middleware: ensure DB is connected before handling any request (critical for serverless)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database connection failed' });
  }
});

import { getSiteSettings } from './controllers/settingsController';

// Use Routes
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the LMS API - Server is LIVE' });
});

app.get('/api/settings', getSiteSettings);

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/gallery', galleryRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (err.message && err.message.toLowerCase().includes('cors')) {
    res.status(403).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if ((err as any).type === 'entity.too.large' || (err as any).status === 413) {
    res.status(413).json({
      success: false,
      message: 'Request entity too large. The uploaded image or file data exceeds size limits.',
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        message: 'Video or attachment is too large. Please upload a smaller file.',
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start server for local development only (Vercel uses the default export directly)
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (0.0.0.0)`);
    });
  });
}

export default app;

