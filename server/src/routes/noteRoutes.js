import express from 'express';
import { getNote, updateNote, addLink, removeLink } from '../controllers/noteController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:conversationId', getNote);
router.put('/:conversationId', updateNote);
router.put('/:conversationId/links', addLink);
router.delete('/:conversationId/links/:linkId', removeLink);

export default router;