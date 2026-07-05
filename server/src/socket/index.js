import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import redis from '../config/redis.js';

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User comes online
    socket.on('user:online', async (userId) => {
      await redis.set(`online:${userId}`, socket.id, 'EX', 3600);
      socket.userId = userId;

      io.emit('user:status', { userId, status: 'online' });
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });

      const onlineKeys = await redis.keys('online:*');
      const onlineUserIds = onlineKeys.map(key => key.replace('online:', ''));
      socket.emit('users:online', onlineUserIds);
    });

    // Join a conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
    });

    // Leave a conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(conversationId);
    });

    // Send a message in real-time
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, replyToId, senderId } = data;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          members: senderId
        });

        if (!conversation) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: senderId,
          content: content.trim(),
          replyTo: replyToId || null
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id
        });

        // Invalidate conversation cache for all members
        await Promise.all(
          conversation.members.map(id => redis.del(`conversations:${id}`))
        );

        const populated = await message.populate([
          { path: 'sender', select: 'name avatarUrl' },
          { path: 'replyTo' }
        ]);

        io.to(conversationId).emit('message:received', populated);

        // Notify other members
        conversation.members.forEach(async (memberId) => {
          if (memberId.toString() !== senderId) {
            const memberSocketId = await redis.get(`online:${memberId}`);
            if (memberSocketId) {
              io.to(memberSocketId).emit('notification:new', {
                type: 'NEW_MESSAGE',
                conversationId,
                message: populated
              });
            }
          }
        });
      } catch (error) {
        console.error('Message send error:', error);
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId, userId, userName }) => {
      socket.to(conversationId).emit('typing:start', { userId, userName });
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing:stop', { userId });
    });

    // Mark messages as read
    socket.on('messages:read', async ({ conversationId, userId }) => {
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          isRead: false
        },
        { isRead: true }
      );
      socket.to(conversationId).emit('messages:read', { conversationId, userId });
    });

    // Real-time note update
    socket.on('note:update', ({ conversationId, content, userId }) => {
      socket.to(conversationId).emit('note:updated', {
        conversationId,
        content,
        updatedBy: userId
      });
    });

    // Real-time task update
    socket.on('task:update', ({ conversationId, task }) => {
      socket.to(conversationId).emit('task:updated', { conversationId, task });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (socket.userId) {
        await redis.del(`online:${socket.userId}`);
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
        io.emit('user:status', { userId: socket.userId, status: 'offline' });
        console.log('User disconnected:', socket.userId);
      }
    });
  });
};

export default initSocket;