import express from 'express';
import {
  getConversations,
  createConversation,
  createGroup,
  searchUsers,
  acceptConversation,
  declineConversation,
  deleteConversation,
  markAsRead
} from '../controllers/conversationController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/', createConversation);
router.post('/group', createGroup);
router.get('/search', searchUsers);
router.put('/:conversationId/accept', acceptConversation);
router.put('/:conversationId/decline', declineConversation);
router.delete('/:conversationId', deleteConversation);
router.put('/:conversationId/read', markAsRead);

export default router;