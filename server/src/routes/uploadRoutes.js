import express from 'express';
import { saveFileMessage } from '../controllers/uploadController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, saveFileMessage);

export default router;