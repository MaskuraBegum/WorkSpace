import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Task from '../models/Task.js';

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatarUrl')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, replyToId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
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
      content: content.trim(),
      replyTo: replyToId || null
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id
    });

    const populated = await message.populate([
      { path: 'sender', select: 'name avatarUrl' },
      { path: 'replyTo' }
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        isRead: false
      },
      { isRead: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Convert message to task
export const convertToTask = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { assignedToId, dueDate } = req.body;

    const message = await Message.findById(messageId).populate('conversation');
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation._id,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if THIS user already converted this message
    const existing = await Task.findOne({
      fromMessage: messageId,
      createdBy: req.user._id
    });

    if (existing) {
      return res.status(400).json({ message: 'You already converted this message to a task' });
    }

    const task = await Task.create({
      title: message.content,
      conversation: message.conversation._id,
      createdBy: req.user._id,
      assignedTo: assignedToId || null,
      dueDate: dueDate || null,
      fromMessage: messageId
    });

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name avatarUrl' },
      { path: 'createdBy', select: 'name avatarUrl' }
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted', messageId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};