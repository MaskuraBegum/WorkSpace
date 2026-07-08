import Note from '../models/Note.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// Get note for a conversation
export const getNote = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    let note = await Note.findOne({ conversation: conversationId })
      .populate('updatedBy', 'name avatarUrl')
      .populate('links.savedBy', 'name')
      .populate('docs.savedBy', 'name');

    if (!note) {
      note = await Note.create({
        conversation: conversationId,
        content: '',
        links: [],
        docs: [],
        updatedBy: req.user._id
      });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update note content
export const updateNote = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const note = await Note.findOneAndUpdate(
      { conversation: conversationId },
      { content, updatedBy: req.user._id },
      { new: true, upsert: true }
    ).populate('updatedBy', 'name avatarUrl');

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add link to note
export const addLink = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { url, name } = req.body;

    if (!url || !name) {
      return res.status(400).json({ message: 'URL and name are required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const note = await Note.findOneAndUpdate(
      { conversation: conversationId },
      { $push: { links: { url, name, savedBy: req.user._id } } },
      { new: true, upsert: true }
    ).populate('links.savedBy', 'name');

    const user = await User.findById(req.user._id).select('name');
    const autoMessage = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: `📎 ${user.name} saved a link: "${name}" → ${url}`,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: autoMessage._id
    });

    const populatedMessage = await autoMessage.populate('sender', 'name avatarUrl');
    res.json({ note, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove link from note
export const removeLink = async (req, res) => {
  try {
    const { conversationId, linkId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    await Note.findOneAndUpdate(
      { conversation: conversationId },
      { $pull: { links: { _id: linkId } } }
    );

    res.json({ message: 'Link removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add document to note
export const addDoc = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { url, name, type, size } = req.body;

    if (!url || !name) {
      return res.status(400).json({ message: 'URL and name are required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const note = await Note.findOneAndUpdate(
      { conversation: conversationId },
      { $push: { docs: { url, name, type, size, savedBy: req.user._id } } },
      { new: true, upsert: true }
    ).populate('docs.savedBy', 'name');

    // Auto message
    const user = await User.findById(req.user._id).select('name');
    const autoMessage = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: `📄 ${user.name} saved a document: "${name}"`,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: autoMessage._id
    });

    const populatedMessage = await autoMessage.populate('sender', 'name avatarUrl');
    const newDoc = note.docs[note.docs.length - 1];

    res.json({ note, doc: newDoc, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove document from note
export const removeDoc = async (req, res) => {
  try {
    const { conversationId, docId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: { $in: [req.user._id] }
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    await Note.findOneAndUpdate(
      { conversation: conversationId },
      { $pull: { docs: { _id: docId } } }
    );

    res.json({ message: 'Document removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};