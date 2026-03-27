'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// ============================================================
// REGISTER
// ============================================================
async function register({ name, email, password }) {
  // Check existing user
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new Error('Email already registered');
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);
  return { user: user.toSafeJSON(), token };
}

// ============================================================
// LOGIN
// ============================================================
async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new Error('Invalid credentials');

  const match = await user.comparePassword(password);
  if (!match) throw new Error('Invalid credentials');

  const token = signToken(user._id);
  return { user: user.toSafeJSON(), token };
}

// ============================================================
// GET USER BY ID
// ============================================================
async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return user.toSafeJSON();
}

// ============================================================
// UPDATE USER WHATSAPP STATE
// ============================================================
async function updateWhatsAppState(userId, data) {
  if (!await isMongoConnected()) return;
  try {
    await User.findByIdAndUpdate(userId, { whatsapp: data });
  } catch (_) {}
}

function isMongoConnected() {
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

// ============================================================
// SIGN JWT TOKEN
// ============================================================
function signToken(userId) {
  return jwt.sign({ userId: userId.toString() }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

module.exports = { register, login, getUserById, updateWhatsAppState };
