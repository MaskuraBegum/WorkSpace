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
      console.log(`✅ Socket ${socket.id} joined room ${conversationId}`);
    });

    // Leave a conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(conversationId);
      console.log(`❌ Socket ${socket.id} left room ${conversationId}`);
    });

    // Send a message in real-time
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, replyToId, senderId } = data;
        console.log('📨 Message received:', { conversationId, senderId, content });

        const conversation = await Conversation.findOne({
          _id: conversationId,
          members: senderId
        });

        if (!conversation) {
          console.log('❌ Conversation not found or user not member');
          return;
        }

        // Block messages in pending conversations
        if (conversation.status === 'pending') {
          const isCreator = conversation.createdBy.toString() === senderId;
          if (!isCreator) {
            socket.emit('error', { message: 'Accept the request first to reply' });
            return;
          }
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: senderId,
          content: content.trim(),
          replyTo: replyToId || null
        });

        // Update last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id
        });

        // Increment unread count for all members except sender
        const unreadUpdates = {};
        conversation.members.forEach(memberId => {
          if (memberId.toString() !== senderId) {
            unreadUpdates[`unreadCounts.${memberId}`] = 1;
          }
        });
        await Conversation.findByIdAndUpdate(conversationId, {
          $inc: unreadUpdates
        });

        // Invalidate cache
        await Promise.all(
          conversation.members.map(id => redis.del(`conversations:${id}`))
        );

        const populated = await message.populate([
          { path: 'sender', select: 'name avatarUrl' },
          { path: 'replyTo' }
        ]);

        const sockets = await io.in(conversationId).fetchSockets();
        console.log(`🏠 Room ${conversationId} has ${sockets.length} sockets`);

        // Send message to everyone in room
        io.to(conversationId).emit('message:received', populated);
        console.log('✅ Emitted message:received to room');

        // Notify other members — update their sidebar conversation
        for (const memberId of conversation.members) {
          if (memberId.toString() === senderId) continue;

          await redis.del(`conversations:${memberId}`);
          const memberSocketId = await redis.get(`online:${memberId}`);

          if (memberSocketId) {
            const fullConversation = await Conversation.findById(conversationId)
              .populate('members', '-password')
              .populate('lastMessage')
              .lean();

            io.to(memberSocketId).emit('conversation:new', fullConversation);
            io.to(memberSocketId).emit('notification:new', {
              type: 'NEW_MESSAGE',
              conversationId,
              message: populated
            });
          }
        }
      } catch (error) {
        console.error('Message send error:', error);
      }
    });

    // Delete message
    socket.on('message:delete', ({ messageId, conversationId }) => {
      io.to(conversationId).emit('message:deleted', { messageId });
    });

    // Broadcast pre-saved message to room
    socket.on('message:broadcast', ({ conversationId, message }) => {
      io.to(conversationId).emit('message:received', message);
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId, userId, userName }) => {
      socket.to(conversationId).emit('typing:start', { userId, userName, conversationId });
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing:stop', { userId, conversationId });
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
      // Reset unread count in conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        [`unreadCounts.${userId}`]: 0
      });
      socket.to(conversationId).emit('messages:read', { conversationId, userId });
    });

    // Real-time note update
    socket.on('note:update', ({ conversationId, content, userId }) => {
      socket.to(conversationId).emit('note:updated', { conversationId, content, updatedBy: userId });
    });

    // Real-time task update
    socket.on('task:update', ({ conversationId, task, isNew }) => {
      socket.to(conversationId).emit('task:updated', { conversationId, task, isNew });
    });

    // Link saved in notes
    socket.on('note:link_add', ({ conversationId, link }) => {
      socket.to(conversationId).emit('note:link_added', { link });
    });

    // Link removed from notes
    socket.on('note:link_remove', ({ conversationId, linkId }) => {
      socket.to(conversationId).emit('note:link_removed', { linkId });
    });

    // Doc saved in notes
    socket.on('note:doc_add', ({ conversationId, doc }) => {
      socket.to(conversationId).emit('note:doc_added', { doc });
    });

    // Doc removed from notes
    socket.on('note:doc_remove', ({ conversationId, docId }) => {
      socket.to(conversationId).emit('note:doc_removed', { docId });
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