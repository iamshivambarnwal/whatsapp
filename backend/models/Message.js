const mongoose = require('mongoose');

// ============================================================
// CRITICAL FIX: Clear mongoose model cache to prevent stale schemas
// This prevents "required" validation errors from old cached schemas
// ============================================================
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: () => new mongoose.Types.ObjectId()
  },
  from: {
    type: String,
    default: 'WhatsApp'
  },
  to: {
    type: String,
    required: false  // Explicitly not required
  },
  body: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'document', 'audio'],
    default: 'text'
  },
  mediaUrl: {
    type: String
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    default: 'outgoing'
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    messageId: String,
    error: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ userId: 1, timestamp: -1 });
messageSchema.index({ userId: 1, from: 1 });
messageSchema.index({ userId: 1, to: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
