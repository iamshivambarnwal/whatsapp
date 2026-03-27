'use strict';

const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    default: 'My Webhook',
    maxlength: 100,
  },
  url: {
    type: String,
    required: [true, 'Webhook URL is required'],
    match: [/^https?:\/\/.+/, 'Invalid URL format'],
  },
  secret: {
    type: String,
    default: () => require('crypto').randomBytes(32).toString('hex'),
  },
  events: {
    type: [String],
    enum: ['message_received', 'message_sent', 'message_delivered', 'message_read'],
    default: ['message_received'],
  },
  active: {
    type: Boolean,
    default: true,
  },
  headers: {
    type: Map,
    of: String,
    default: {},
  },
  // Track delivery stats
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  lastTriggered: { type: Date, default: null },
}, {
  timestamps: true,
});

webhookSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
