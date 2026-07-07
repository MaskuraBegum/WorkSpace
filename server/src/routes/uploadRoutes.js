import express from 'express';
import { uploadFile } from '../controllers/uploadController.js';
import protect from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.post('/', protect, upload.single('file'), uploadFile);

export default router;
