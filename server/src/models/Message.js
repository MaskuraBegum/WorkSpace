import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  url: String,
  name: String,
  type: String,
  size: Number
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  file: {
    type: fileSchema,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);