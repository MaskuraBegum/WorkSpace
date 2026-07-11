import express from 'express';
import { getMessages, sendMessage, markAsRead, convertToTask, deleteMessage } from '../controllers/messageController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:conversationId', getMessages);
router.post('/', sendMessage);
router.put('/read/:conversationId', markAsRead);
router.post('/convert/:messageId', convertToTask);
router.delete('/:messageId', protect, deleteMessage);

export default router;
