import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    unique: true
  },
  content: { type: String, default: '' },
  links: [linkSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);