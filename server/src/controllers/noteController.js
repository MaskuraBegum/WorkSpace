import Note from '../models/Note.js';
import Conversation from '../models/Conversation.js';

// Get note for a conversation
export const getNote = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    let note = await Note.findOne({ conversation: conversationId })
      .populate('updatedBy', 'name avatarUrl');

    // Create note if it doesn't exist yet
    if (!note) {
      note = await Note.create({
        conversation: conversationId,
        content: '',
        updatedBy: req.user._id
      });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update note
export const updateNote = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const note = await Note.findOneAndUpdate(
      { conversation: conversationId },
      {
        content,
        updatedBy: req.user._id
      },
      { new: true, upsert: true }
    ).populate('updatedBy', 'name avatarUrl');

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
