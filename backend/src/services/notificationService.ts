import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Notification, { INotification } from '../models/Notification';
import Enrollment from '../models/Enrollment';
import User from '../models/User';
import mongoose from 'mongoose';

let io: SocketIOServer | null = null;

const getAllowedOrigins = (): string[] => {
  const value = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const initSocket = (server: HttpServer): SocketIOServer => {
  const allowedOrigins = getAllowedOrigins();

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by Socket.IO CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join personal user room
    socket.on('join_user', (userId: string) => {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${roomName}`);
      }
    });

    // Join role room
    socket.on('join_role', (role: string) => {
      if (['student', 'instructor', 'admin'].includes(role)) {
        const roomName = `role_${role}`;
        socket.join(roomName);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${roomName}`);
      }
    });

    // Join batch room
    socket.on('join_batch', (batchId: string) => {
      if (batchId) {
        const roomName = `batch_${batchId}`;
        socket.join(roomName);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${roomName}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

export interface SendNotificationOptions {
  userIds?: (string | mongoose.Types.ObjectId)[];
  role?: 'student' | 'instructor' | 'admin' | 'all';
  batchId?: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type?: string;
  relatedId?: string | mongoose.Types.ObjectId;
  link?: string;
}

export const sendNotification = async (options: SendNotificationOptions): Promise<INotification[]> => {
  try {
    const { userIds, role, batchId, title, message, type = 'general', relatedId, link } = options;
    let targetUserIds: string[] = [];

    // 1. Resolve target users
    if (userIds && userIds.length > 0) {
      targetUserIds = userIds.map((id) => id.toString());
    } else if (batchId) {
      if (batchId.toString() === 'all') {
        const students = await User.find({ role: 'student', is_active: true }).select('_id');
        targetUserIds = students.map((s) => s._id.toString());
      } else {
        const enrollments = await Enrollment.find({ batch_id: batchId, status: 'active' }).select('student_id');
        targetUserIds = enrollments.map((e) => e.student_id.toString());
      }
    } else if (role) {
      if (role === 'all') {
        const users = await User.find({ is_active: true }).select('_id');
        targetUserIds = users.map((u) => u._id.toString());
      } else {
        const users = await User.find({ role, is_active: true }).select('_id');
        targetUserIds = users.map((u) => u._id.toString());
      }
    }

    if (targetUserIds.length === 0) {
      return [];
    }

    const notificationDocs = await Promise.all(
      targetUserIds.map(async (userId) => {
        const notification = await Notification.create({
          user_id: userId,
          title,
          message,
          type,
          related_id: relatedId,
          link,
          is_read: false,
        });

        if (io) {
          io.to(`user_${userId}`).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link,
            createdAt: notification.createdAt,
          });
        }

        return notification;
      })
    );

    return notificationDocs;
  } catch (error) {
    console.error('[NotificationService] sendNotification failed:', error);
    return [];
  }
};
