const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['sending', 'delivered', 'failed', 'info', 'error'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  },
  metadata: {
    number: String,
    messageId: String,
    jobId: String,
    error: String
  }
}, {
  timestamps: true
});

// Index for faster queries
logSchema.index({ userId: 1, time: -1 });
logSchema.index({ type: 1, time: -1 });

module.exports = mongoose.model('Log', logSchema);
