import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import redis from '../config/redis.js';
import { io } from '../index.js';

// Get all conversations for logged in user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: req.user._id,
      status: { $ne: 'declined' }
    })
      .populate('members', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    // Add unread count per conversation for this user
    const withUnread = conversations.map(c => ({
      ...c,
      unreadCount: c.unreadCounts?.[req.user._id.toString()] || 0
    }));

    res.json(withUnread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create or get 1-on-1 conversation
export const createConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    const existing = await Conversation.findOne({
      isGroup: false,
      members: { $all: [req.user._id, userId] }
    })
      .populate('members', '-password')
      .populate('lastMessage');

    if (existing) return res.json(existing);

    // New conversation starts as pending for the other user
    const conversation = await Conversation.create({
      members: [req.user._id, userId],
      createdBy: req.user._id,
      status: 'pending',
      acceptedBy: [req.user._id] // creator auto-accepts
    });

    await redis.del(`conversations:${req.user._id}`);
    await redis.del(`conversations:${userId}`);

    const populated = await conversation.populate('members', '-password');

    // Notify the other user in real-time
    const otherUserSocketId = await redis.get(`online:${userId}`);
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit('conversation:request', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept a message request
export const acceptConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, members: req.user._id },
      {
        status: 'active',
        $addToSet: { acceptedBy: req.user._id }
      },
      { new: true }
    )
      .populate('members', '-password')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Notify creator that request was accepted
    const creatorSocketId = await redis.get(`online:${conversation.createdBy}`);
    if (creatorSocketId) {
      io.to(creatorSocketId).emit('conversation:accepted', conversation);
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Decline a message request
export const declineConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, members: req.user._id },
      { status: 'declined' },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({ message: 'Request declined' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete conversation
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Delete all messages
    await Message.deleteMany({ conversation: conversationId });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    // Invalidate cache for all members
    await Promise.all(
      conversation.members.map(id => redis.del(`conversations:${id}`))
    );

    // Notify all members
    conversation.members.forEach(async (memberId) => {
      const socketId = await redis.get(`online:${memberId}`);
      if (socketId) {
        io.to(socketId).emit('conversation:deleted', { conversationId });
      }
    });

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark conversation as read
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCounts.${req.user._id}`]: 0
    });

    // Mark all messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        isRead: false
      },
      { isRead: true }
    );

    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create group conversation
export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || members.length < 2) {
      return res.status(400).json({ message: 'Group needs a name and at least 2 members' });
    }

    const allMembers = [...members, req.user._id.toString()];

    const conversation = await Conversation.create({
      name,
      isGroup: true,
      members: allMembers,
      createdBy: req.user._id,
      status: 'active',
      acceptedBy: allMembers
    });

    await Promise.all(allMembers.map(id => redis.del(`conversations:${id}`)));

    const populated = await conversation.populate('members', '-password');

    for (const memberId of allMembers) {
      if (memberId.toString() === req.user._id.toString()) continue;
      const socketId = await redis.get(`online:${memberId}`);
      if (socketId) {
        io.to(socketId).emit('conversation:new', populated);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};