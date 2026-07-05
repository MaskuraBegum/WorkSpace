import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import redis from '../config/redis.js';

// Get all conversations for logged in user
export const getConversations = async (req, res) => {
  try {
    const cacheKey = `conversations:${req.user._id}`;

    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const conversations = await Conversation.find({
      members: req.user._id
    })
      .populate('members', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    // Cache for 30 seconds
    await redis.setex(cacheKey, 30, JSON.stringify(conversations));

    res.json(conversations);
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

    const conversation = await Conversation.create({
      members: [req.user._id, userId],
      createdBy: req.user._id
    });

    // Invalidate cache for both users
    await redis.del(`conversations:${req.user._id}`);
    await redis.del(`conversations:${userId}`);

    const populated = await conversation.populate('members', '-password');
    res.status(201).json(populated);
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
      createdBy: req.user._id
    });

    // Invalidate cache for all members
    await Promise.all(allMembers.map(id => redis.del(`conversations:${id}`)));

    const populated = await conversation.populate('members', '-password');
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