import express from 'express';
import {
  getMessages,
  sendMessage,
  markAsRead,
  convertToTask
} from '../controllers/messageController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:conversationId', getMessages);
router.post('/', sendMessage);
router.put('/read/:conversationId', markAsRead);
router.post('/convert/:messageId', convertToTask);

export default router;
