'use strict';

const authService = require('../services/authService');

// ============================================================
// POST /api/auth/register
// ============================================================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const { user, token } = await authService.register({ name, email, password });
    res.status(201).json({ success: true, user, token });
  } catch (err) {
    if (err.message === 'Email already registered') {
      return res.status(409).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// POST /api/auth/login
// ============================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { user, token } = await authService.login({ email, password });
    res.json({ success: true, user, token });
  } catch (err) {
    if (err.message === 'Invalid credentials') {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/auth/me
// ============================================================
exports.me = async (req, res) => {
  try {
    const user = await authService.getUserById(req.userId);
    res.json({ success: true, user });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};
