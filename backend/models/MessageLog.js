'use strict';

const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  to: {
    type: String,
    required: [true, 'Recipient number is required'],
    trim: true,
  },
  body: {
    type: String,
    required: [true, 'Message body is required'],
  },
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'delivered', 'failed'],
    default: 'queued',
  },
  mediaUrl: {
    type: String,
    default: null,
  },
  whatsappMessageId: {
    type: String,
    default: null,
  },
  jobId: {
    type: String,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  sentAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for fast queries
messageLogSchema.index({ userId: 1, createdAt: -1 });
messageLogSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('MessageLog', messageLogSchema);
