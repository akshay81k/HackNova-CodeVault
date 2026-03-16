const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy');

const verifyTurnstile = async (token) => {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.success;
  } catch (err) {
    console.error('[Auth] Turnstile verification error:', err.message);
    return false;
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register new user (organizer or user)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, turnstileToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (!await verifyTurnstile(turnstileToken)) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed.' });
    }

    // Only allow organizer or user registration publicly
    const allowedRoles = ['organizer', 'user'];
    const userRole = role && allowedRoles.includes(role) ? role : 'user';

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      organization: organization || ''
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    if (!await verifyTurnstile(turnstileToken)) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const jwt_module = require('jsonwebtoken');
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    const decoded = jwt_module.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, organization: user.organization } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
});

// @route   POST /api/auth/admin/create
// @desc    Create admin account (protected, only existing admin or first setup)
// @access  Semi-public (needs secret key)
router.post('/admin/create', async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (adminSecret !== process.env.JWT_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid admin secret.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, role: 'admin' });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Admin account created.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/auth/google
// @desc    Login or register via Google Sign-In
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { googleToken, turnstileToken, role, organization } = req.body;

    if (!await verifyTurnstile(turnstileToken)) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID || 'dummy',
    }).catch(() => null);

    if (!ticket) {
      return res.status(401).json({ success: false, message: 'Invalid Google token.' });
    }

    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      const allowedRoles = ['organizer', 'user'];
      const userRole = role && allowedRoles.includes(role) ? role : 'user';
      // Create a random safe password for the auto-created account
      const randomPass = require('crypto').randomBytes(12).toString('hex');
      
      user = await User.create({
        name: payload.name,
        email: payload.email,
        password: randomPass,
        role: userRole,
        organization: organization || ''
      });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Google login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });

  } catch (err) {
    console.error('[Auth] Google Auth Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal Server Error during Google Auth.' });
  }
});

module.exports = router;
