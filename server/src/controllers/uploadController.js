import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

export const uploadFile = async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
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
      file: {
        url: req.file.path,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      }
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id
    });

    const populated = await message.populate('sender', 'name avatarUrl');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
