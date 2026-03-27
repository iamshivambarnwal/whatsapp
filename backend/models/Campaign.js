'use strict';

const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: [true, 'Message body is required'],
    maxlength: 4096,
  },
  mediaUrl: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['draft', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft',
  },
  total: {
    type: Number,
    default: 0,
  },
  sent: {
    type: Number,
    default: 0,
  },
  failed: {
    type: Number,
    default: 0,
  },
  // Batch processing control
  batchSize: {
    type: Number,
    default: 20,
    max: 50,
  },
  batchDelaySeconds: {
    type: Number,
    default: 60,
    min: 30,
    max: 120,
  },
  // Track batch processing state
  lastBatchAt: {
    type: Date,
    default: null,
  },
  processedContacts: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

campaignSchema.index({ userId: 1, status: 1 });
campaignSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Campaign', campaignSchema);
