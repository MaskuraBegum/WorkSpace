import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// Get all conversations for logged in user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: req.user._id
    })
      .populate('members', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create or get 1-on-1 conversation
export const createConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if conversation already exists
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

    const conversation = await Conversation.create({
      name,
      isGroup: true,
      members: [...members, req.user._id],
      createdBy: req.user._id
    });

    const populated = await conversation.populate('members', '-password');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search users to start a conversation
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
