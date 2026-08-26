import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Notification, { INotification } from '../models/Notification';
import Enrollment from '../models/Enrollment';
import User from '../models/User';
import mongoose from 'mongoose';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
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

    // Deduplicate user IDs
    targetUserIds = Array.from(new Set(targetUserIds));

    if (targetUserIds.length === 0) {
      console.warn('[NotificationService] No target users found for notification:', options.title);
      return [];
    }

    // 2. Bulk insert notifications in database
    const notificationDocs = targetUserIds.map((uid) => ({
      user_id: new mongoose.Types.ObjectId(uid),
      title,
      message,
      type,
      related_id: relatedId ? new mongoose.Types.ObjectId(relatedId.toString()) : undefined,
      link,
      is_read: false,
    }));

    const createdNotifications = await Notification.insertMany(notificationDocs);

    // 3. Emit real-time Socket.io events to target user rooms
    if (io) {
      createdNotifications.forEach((notif) => {
        const userIdStr = notif.user_id.toString();
        io?.to(`user_${userIdStr}`).emit('notification', notif);
      });

      // Also emit to batch or role rooms if applicable for live room listeners
      if (batchId) {
        io.to(`batch_${batchId.toString()}`).emit('notification', {
          title,
          message,
          type,
          relatedId,
          link,
          createdAt: new Date(),
        });
      }

      if (role && role !== 'all') {
        io.to(`role_${role}`).emit('notification', {
          title,
          message,
          type,
          relatedId,
          link,
          createdAt: new Date(),
        });
      }
    }

    // 4. Send Mobile Push Notifications to phone notification bar (FCM / Expo Push)
    try {
      const usersWithTokens = await User.find({
        _id: { $in: targetUserIds },
        $or: [
          { expo_push_token: { $exists: true, $ne: '' } },
          { fcm_token: { $exists: true, $ne: '' } }
        ]
      }).select('expo_push_token fcm_token');

      const expoTokens: string[] = [];
      usersWithTokens.forEach((u) => {
        const token = u.expo_push_token || u.fcm_token;
        if (token && token.trim()) {
          expoTokens.push(token.trim());
        }
      });

      if (expoTokens.length > 0) {
        console.log(`[NotificationService] Sending push notification to ${expoTokens.length} mobile devices...`);
        const pushMessages = expoTokens.map((token) => ({
          to: token,
          sound: 'default',
          title: title,
          body: message,
          data: { type, relatedId: relatedId?.toString() || '', link: link || '' },
        }));

        // Send via Expo Push API
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pushMessages),
        }).catch((err) => console.warn('[NotificationService] Push API call error:', err));
      }
    } catch (pushErr) {
      console.warn('[NotificationService] Mobile push notification error:', pushErr);
    }

    console.log(`[NotificationService] Sent "${title}" to ${targetUserIds.length} users.`);
    return createdNotifications as unknown as INotification[];
  } catch (error) {
    console.error('[NotificationService] Error sending notification:', error);
    return [];
  }
};
