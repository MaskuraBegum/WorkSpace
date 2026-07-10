import express from 'express';
import {
  getProfile,
  updateAvatar,
  updateName,
  changePassword,
  deleteAccount
} from '../controllers/profileController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getProfile);
router.put('/avatar', updateAvatar);
router.put('/name', updateName);
router.put('/password', changePassword);
router.delete('/', deleteAccount);

export default router;
