'use strict';

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
    maxlength: 200,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
  },
  // Optional fields
  email: { type: String, default: null },
  tags: { type: [String], default: [] },
  // Track which campaigns this contact was sent to
  campaignsSent: [{
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  }],
}, {
  timestamps: true,
});

// Prevent duplicate contacts per user
contactSchema.index({ userId: 1, phone: 1 }, { unique: true });
contactSchema.index({ userId: 1, name: 'text' });

module.exports = mongoose.model('Contact', contactSchema);
