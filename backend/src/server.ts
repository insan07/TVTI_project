import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import Routes
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import adminRoutes from './routes/admin';
import userRoutes from './routes/userRoutes';
import studentRoutes from './routes/students';
import instructorRoutes from './routes/instructors';
import notificationRoutes from './routes/notifications';
import announcementRoutes from './routes/announcements';

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
  max: 100, // Limit each IP to 100 requests per `window`
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' },
});
app.use('/api', apiLimiter);

// Database Connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) throw new Error('MONGO_URI is not defined');
    await mongoose.connect(mongoURI);
    isConnected = true;
    console.log('MongoDB Connected successfully.');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
  }
};

// Use Routes
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the LMS API - Server is LIVE' });
});

app.use('/api/auth', authRoutes);
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
