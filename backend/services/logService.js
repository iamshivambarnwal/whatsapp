'use strict';

const Log = require('../models/Log');

// Check if MongoDB is connected
function isMongoConnected() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

// Add a log entry to MongoDB (fails silently if DB is down)
async function addLog(type, text, metadata = {}) {
  try {
    if (!isMongoConnected()) {
      console.warn(`⚠️  [logService] MongoDB down — skipping log: [${type}] ${text}`);
      return null;
    }
    const log = new Log({ type, text, metadata, time: new Date() });
    await log.save();
    return log;
  } catch (error) {
    // Log to console instead — don't crash the caller
    console.warn(`⚠️  [logService] Could not save log to DB: ${error.message}`);
    console.warn(`   Falling back to console: [${type}] ${text}`);
    return null;
  }
}

// Get all logs for a user
async function getAllLogs(userId) {
  try {
    if (!isMongoConnected()) return [];
    return await Log.find({ userId })
      .sort({ time: -1 })
      .limit(1000)
      .lean();
  } catch (error) {
    console.error('❌ [logService] getAllLogs error:', error.message);
    return [];
  }
}

// Get logs by type
async function getLogsByType(userId, type) {
  try {
    if (!isMongoConnected()) return [];
    return await Log.find({ userId, type })
      .sort({ time: -1 })
      .limit(500)
      .lean();
  } catch (error) {
    console.error('❌ [logService] getLogsByType error:', error.message);
    return [];
  }
}

// Get recent logs
async function getRecentLogs(userId, limit = 100) {
  try {
    if (!isMongoConnected()) return [];
    return await Log.find({ userId })
      .sort({ time: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('❌ [logService] getRecentLogs error:', error.message);
    return [];
  }
}

// Clear all logs for a user
async function clearLogs(userId) {
  try {
    if (!isMongoConnected()) return { deletedCount: 0 };
    return await Log.deleteMany({ userId });
  } catch (error) {
    console.error('❌ [logService] clearLogs error:', error.message);
    return { deletedCount: 0 };
  }
}

// Get log count
async function getLogCount(userId) {
  try {
    if (!isMongoConnected()) return 0;
    return await Log.countDocuments({ userId });
  } catch (error) {
    return 0;
  }
}

module.exports = {
  addLog,
  getAllLogs,
  getLogsByType,
  getRecentLogs,
  clearLogs,
  getLogCount,
  LOG_TYPES: {
    SENDING: 'sending',
    DELIVERED: 'delivered',
    FAILED: 'failed',
    INFO: 'info',
    ERROR: 'error',
  },
};
