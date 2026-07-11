import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOTPEmail } from '../config/email.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register — save user as unverified, send OTP
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if verified user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Delete unverified user if exists (re-registration)
    if (existingUser && !existingUser.isVerified) {
      await User.deleteOne({ email });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create unverified user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false
    });

    // Generate and save OTP
    const otp = generateOTP();
    await Otp.deleteMany({ email }); // clear old OTPs
    await Otp.create({ email, otp });

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    res.status(201).json({
      message: 'OTP sent to your email',
      email,
      requiresVerification: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find OTP
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please register again.' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    // Verify user
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ message: 'User not found. Please register again.' });
    }

    // Delete used OTP
    await Otp.deleteMany({ email });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(400).json({ message: 'User not found or already verified' });
    }

    const otp = generateOTP();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });
    await sendOTPEmail(email, otp, user.name);

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login — block unverified users
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Block unverified users
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email first',
        requiresVerification: true,
        email
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
export const getMe = async (req, res) => {
  res.json(req.user);
};