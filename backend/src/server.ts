import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dns from 'dns';
import multer from 'multer';

// Force Google DNS servers to resolve MongoDB Atlas queryTxt/SRV lookups reliably
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Import Routes
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import adminRoutes from './routes/admin';
import userRoutes from './routes/userRoutes';
import studentRoutes from './routes/students';
import instructorRoutes from './routes/instructors';
import applicationRoutes from './routes/applications';
import notificationRoutes from './routes/notifications';
import announcementRoutes from './routes/announcements';
import User from './models/User';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Generous limit for dev & live usage
  message: { success: false, message: 'Too many requests from this IP, please try again later' },
});
app.use('/api', apiLimiter);

// Database Connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/twintec_lms';
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
  }
};

// Use Routes
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the LMS API - Server is LIVE' });
});

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
// app.use('/api/users', userRoutes);
// ...

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

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

// Connect Database
connectDB();

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
