'use strict';

const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  // Keyword matching
  trigger: {
    type: String,
    required: [true, 'Trigger keyword is required'],
    trim: true,
    lowercase: true,
  },
  // Match mode: contains | exact | starts_with
  matchMode: {
    type: String,
    enum: ['contains', 'exact', 'starts_with'],
    default: 'contains',
  },
  // Auto-reply message
  replyMessage: {
    type: String,
    required: [true, 'Reply message is required'],
    maxlength: 4096,
  },
  // Optional media
  replyMediaUrl: { type: String, default: null },
  // Priority (higher = checked first)
  priority: { type: Number, default: 0 },
  // Active state
  active: { type: Boolean, default: true },
}, {
  timestamps: true,
});

automationRuleSchema.index({ userId: 1, active: 1, priority: -1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
