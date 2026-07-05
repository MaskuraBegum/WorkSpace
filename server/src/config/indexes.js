import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Task from '../models/Task.js';

export const createIndexes = async () => {
  try {
    await Message.collection.createIndex({ conversation: 1, createdAt: -1 });
    await Message.collection.createIndex({ sender: 1 });
    await Conversation.collection.createIndex({ members: 1, updatedAt: -1 });
    await Task.collection.createIndex({ conversation: 1, status: 1 });
    await Task.collection.createIndex({ dueDate: 1 });
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('Index creation error:', error);
  }
};
