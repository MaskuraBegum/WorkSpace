import express from 'express';
import { getNote, updateNote } from '../controllers/noteController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:conversationId', getNote);
router.put('/:conversationId', updateNote);

export default router;
