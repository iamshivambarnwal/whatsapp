'use strict';

const MessageLog = require('../models/MessageLog');

async function isMongoConnected() {
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

// ============================================================
// LOG A MESSAGE (queued)
// ============================================================
async function logMessage(userId, data) {
  if (!await isMongoConnected()) {
    console.warn(`⚠️  [messageService] MongoDB unavailable, skipping log`);
    return null;
  }
  try {
    return await MessageLog.create({
      userId,
      to: data.to,
      body: data.body,
      status: 'queued',
      mediaUrl: data.mediaUrl || null,
      jobId: data.jobId || null,
    });
  } catch (err) {
    console.error(`❌ [messageService] logMessage error:`, err.message);
    return null;
  }
}

// ============================================================
// UPDATE MESSAGE STATUS
// ============================================================
async function updateStatus(messageLogId, status, extra = {}) {
  if (!await isMongoConnected()) return;
  try {
    await MessageLog.findByIdAndUpdate(messageLogId, { status, ...extra });
  } catch (err) {
    console.error(`❌ [messageService] updateStatus error:`, err.message);
  }
}

// ============================================================
// UPDATE STATUS BY JOB ID
// ============================================================
async function updateStatusByJobId(userId, jobId, status, extra = {}) {
  if (!await isMongoConnected()) return;
  try {
    await MessageLog.findOneAndUpdate(
      { userId, jobId },
      { status, ...extra }
    );
  } catch (err) {
    console.error(`❌ [messageService] updateStatusByJobId error:`, err.message);
  }
}

// ============================================================
// UPDATE STATUS BY WHATSAPP MESSAGE ID (for delivery tracking)
// ============================================================
async function updateStatusByMessageId(whatsappMessageId, status) {
  if (!await isMongoConnected()) return;
  try {
    await MessageLog.findOneAndUpdate(
      { whatsappMessageId },
      { status },
      { sort: { createdAt: -1 } } // Update latest if duplicate IDs
    );
  } catch (err) {
    console.error(`❌ [messageService] updateStatusByMessageId error:`, err.message);
  }
}

// ============================================================
// GET MESSAGES FOR A USER
// ============================================================
async function getMessages(userId, { limit = 50, status = null } = {}) {
  if (!await isMongoConnected()) return [];
  try {
    const query = { userId };
    if (status) query.status = status;
    return await MessageLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error(`❌ [messageService] getMessages error:`, err.message);
    return [];
  }
}

// ============================================================
// GET MESSAGE STATS FOR A USER
// ============================================================
async function getStats(userId) {
  if (!await isMongoConnected()) {
    return { queued: 0, sent: 0, failed: 0, total: 0 };
  }
  try {
    const [queued, sent, failed, total] = await Promise.all([
      MessageLog.countDocuments({ userId, status: 'queued' }),
      MessageLog.countDocuments({ userId, status: 'sent' }),
      MessageLog.countDocuments({ userId, status: 'failed' }),
      MessageLog.countDocuments({ userId }),
    ]);
    return { queued, sent, failed, total };
  } catch (err) {
    console.error(`❌ [messageService] getStats error:`, err.message);
    return { queued: 0, sent: 0, failed: 0, total: 0 };
  }
}

module.exports = { logMessage, updateStatus, updateStatusByJobId, getMessages, getStats };
