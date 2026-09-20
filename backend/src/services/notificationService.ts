import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Notification, { INotification } from '../models/Notification';
import Enrollment from '../models/Enrollment';
import User from '../models/User';
import Batch from '../models/Batch';
import mongoose from 'mongoose';
import { isAllowedOrigin } from '../config/cors';

let io: SocketIOServer | null = null;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }
  return secret;
};

const authenticateSocket = async (socket: Socket): Promise<{ _id: string; role: string } | null> => {
  const authToken =
    socket.handshake.auth?.token ||
    socket.handshake.headers.authorization?.toString().replace(/^Bearer\s+/i, '');

  if (!authToken) {
    return null;
  }

  try {
    const decoded = jwt.verify(authToken, getJwtSecret()) as { id?: string };
    if (!decoded?.id) {
      return null;
    }

    const user = await User.findById(decoded.id).select('_id role is_active');
    if (!user || !user.is_active) {
      return null;
    }

    socket.data.user = {
      _id: user._id.toString(),
      role: user.role,
    };

    return {
      _id: user._id.toString(),
      role: user.role,
    };
  } catch {
    return null;
  }
};

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        console.warn(`[Socket.IO CORS] Rejected unauthorized origin: ${origin}`);
        callback(new Error(`Not allowed by Socket.IO CORS: ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket);
    if (!user) {
      return next(new Error('Unauthorized socket connection'));
    }
    return next();
  });

  io.on('connection', (socket: Socket) => {
    const requester = socket.data.user as { _id: string; role: string } | undefined;
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join personal user room
    socket.on('join_user', async (userId: string) => {
      if (!requester) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      const targetUserId = String(userId || '');
      if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
        socket.emit('error', 'Invalid user ID');
        return;
      }

      if (requester._id !== targetUserId) {
        socket.emit('error', 'You are not allowed to join this room');
        return;
      }

      const roomName = `user_${targetUserId}`;
      socket.join(roomName);
      console.log(`[Socket.io] Socket ${socket.id} joined room ${roomName}`);
    });

    // Join role room
    socket.on('join_role', async (role: string) => {
      if (!requester) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      const requestedRole = String(role || '');
      if (!['student', 'instructor', 'admin'].includes(requestedRole)) {
        socket.emit('error', 'Invalid role');
        return;
      }

      if (requester.role !== requestedRole) {
        socket.emit('error', 'You are not allowed to join this role room');
        return;
      }

      const roomName = `role_${requestedRole}`;
      socket.join(roomName);
      console.log(`[Socket.io] Socket ${socket.id} joined room ${roomName}`);
    });

    // Join batch room
    socket.on('join_batch', async (batchId: string) => {
      if (!requester) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      const targetBatchId = String(batchId || '');
      if (!targetBatchId || !mongoose.Types.ObjectId.isValid(targetBatchId)) {
        socket.emit('error', 'Invalid batch ID');
        return;
      }

      const isAdmin = requester.role === 'admin';
      const isInstructor = await Batch.exists({
        _id: targetBatchId,
        instructor_ids: requester._id,
      });
      const isStudent = await Enrollment.exists({
        batch_id: targetBatchId,
        student_id: requester._id,
        status: 'active',
      });

      if (!isAdmin && !isInstructor && !isStudent) {
        socket.emit('error', 'You are not allowed to join this batch room');
        return;
      }

      const roomName = `batch_${targetBatchId}`;
      socket.join(roomName);
      console.log(`[Socket.io] Socket ${socket.id} joined room ${roomName}`);
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
