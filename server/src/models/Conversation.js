import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  isGroup: { type: Boolean, default: false },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  status: {
    type: String,
    enum: ['active', 'pending', 'declined'],
    default: 'active'
  },
  // who has accepted the conversation
  acceptedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);