import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

export const saveFileMessage = async (req, res) => {
  try {
    console.log('Upload request body:', req.body);

    const { conversationId, url, name, type, size } = req.body;

    if (!url || !conversationId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: '',
      file: { url, name, type, size }
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id
    });

    const populated = await message.populate('sender', 'name avatarUrl');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ message: error.message });
  }
};