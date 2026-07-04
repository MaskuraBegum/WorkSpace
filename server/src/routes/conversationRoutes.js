import express from 'express';
import {
  getConversations,
  createConversation,
  createGroup,
  searchUsers
} from '../controllers/conversationController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/', createConversation);
router.post('/group', createGroup);
router.get('/search', searchUsers);

export default router;
