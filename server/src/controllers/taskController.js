import Task from '../models/Task.js';
import Conversation from '../models/Conversation.js';

// Get all tasks for a conversation
export const getTasks = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const tasks = await Task.find({ conversation: conversationId })
      .populate('assignedTo', 'name avatarUrl')
      .populate('createdBy', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a task
export const createTask = async (req, res) => {
  try {
    const { conversationId, title, assignedToId, dueDate } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const task = await Task.create({
      title: title.trim(),
      conversation: conversationId,
      createdBy: req.user._id,
      assignedTo: assignedToId || null,
      dueDate: dueDate || null
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

// Update task status
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, title, assignedToId, dueDate } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check user is member of conversation
    const conversation = await Conversation.findOne({
      _id: task.conversation,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        ...(status && { status }),
        ...(title && { title }),
        ...(assignedToId && { assignedTo: assignedToId }),
        ...(dueDate && { dueDate })
      },
      { new: true }
    )
      .populate('assignedTo', 'name avatarUrl')
      .populate('createdBy', 'name avatarUrl');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete task
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const conversation = await Conversation.findOne({
      _id: task.conversation,
      members: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Task.findByIdAndDelete(taskId);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all tasks across all conversations (dashboard)
export const getAllMyTasks = async (req, res) => {
  try {
    const { status } = req.query;

    // Get all conversations user is member of
    const conversations = await Conversation.find({
      members: req.user._id
    }).select('_id');

    const conversationIds = conversations.map(c => c._id);

    const filter = {
      conversation: { $in: conversationIds },
      ...(status && { status })
    };

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name avatarUrl')
      .populate('createdBy', 'name avatarUrl')
      .populate('conversation', 'name members')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    // Mark overdue tasks
    const now = new Date();
    const tasksWithOverdue = tasks.map(task => ({
      ...task,
      isOverdue: task.dueDate && task.dueDate < now && task.status !== 'DONE'
    }));

    res.json(tasksWithOverdue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
