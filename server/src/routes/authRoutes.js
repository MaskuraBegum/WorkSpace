import express from 'express';
import {
  register,
  login,
  getMe,
  verifyOTP,
  resendOTP
} from '../controllers/authController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/me', protect, getMe);

export default router;