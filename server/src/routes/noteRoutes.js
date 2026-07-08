import express from 'express';
import {
  getNote,
  updateNote,
  addLink,
  removeLink,
  addDoc,
  removeDoc
} from '../controllers/noteController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:conversationId', getNote);
router.put('/:conversationId', updateNote);
router.put('/:conversationId/links', addLink);
router.delete('/:conversationId/links/:linkId', removeLink);
router.put('/:conversationId/docs', addDoc);
router.delete('/:conversationId/docs/:docId', removeDoc);

export default router;