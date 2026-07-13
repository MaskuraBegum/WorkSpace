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

// Register — only send OTP, don't create account yet
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
    const existingUser = await User.findOne({ email, isVerified: true });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();

    // Clear any existing OTPs for this email
    await Otp.deleteMany({ email });

    // Store registration data temporarily in OTP record
    await Otp.create({
      email,
      otp,
      metadata: JSON.stringify({ name, hashedPassword })
    });

    // Try to send email — if fails, clean up and return error
    try {
      await sendOTPEmail(email, otp, name);
    } catch (emailError) {
      await Otp.deleteMany({ email });
      console.error('Email send error:', emailError.message);
      return res.status(500).json({
        message: 'Failed to send verification email. Please check your email address and try again.'
      });
    }

    res.status(200).json({
      message: 'OTP sent to your email',
      email,
      requiresVerification: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP — create account only after successful verification
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'OTP expired or not found. Please register again.'
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        message: 'OTP has expired. Please register again.'
      });
    }

    // Parse stored registration data
    let metadata = {};
    try {
      metadata = JSON.parse(otpRecord.metadata || '{}');
    } catch {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        message: 'Session expired. Please register again.'
      });
    }

    const { name, hashedPassword } = metadata;

    if (!name || !hashedPassword) {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        message: 'Session expired. Please register again.'
      });
    }

    // Delete OTP record
    await Otp.deleteMany({ email });

    // NOW create the verified account
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: true
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isVerified: true,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend OTP — uses stored metadata, no user needed
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find existing OTP record with stored registration data
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'Session expired. Please register again.'
      });
    }

    // Parse stored registration data to get name
    let metadata = {};
    try {
      metadata = JSON.parse(otpRecord.metadata || '{}');
    } catch {
      return res.status(400).json({
        message: 'Session expired. Please register again.'
      });
    }

    const { name } = metadata;

    // Generate new OTP but keep same registration data
    const otp = generateOTP();
    await Otp.deleteMany({ email });
    await Otp.create({
      email,
      otp,
      metadata: otpRecord.metadata // keep original registration data
    });

    // Try to send email
    try {
      await sendOTPEmail(email, otp, name || 'there');
    } catch (emailError) {
      await Otp.deleteMany({ email });
      return res.status(500).json({
        message: 'Failed to send email. Please check your email address and try again.'
      });
    }

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login — only verified users can login
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