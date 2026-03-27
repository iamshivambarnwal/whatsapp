'use strict';

const queueService = require('../services/queueService');
const messageService = require('../services/messageService');
const whatsappService = require('../services/whatsappService');
const usageService = require('../services/usageService');
const rateLimiter = require('../utils/rateLimiter');
const { PLAN_LIMITS } = require('../utils/rateLimiter');

// ============================================================
// POST /api/messages/send
// ============================================================
exports.send = async (req, res) => {
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`📨 [controller:send] INCOMING MESSAGE REQUEST`);
  console.log(`═══════════════════════════════════════════════`);

  try {
    const userId = req.userId;
    const { number, message, mediaUrl, priority } = req.body;

    console.log(`   userId: ${userId}`);
    console.log(`   number: ${number}`);
    console.log(`   message: ${message?.substring(0, 50)}...`);
    console.log(`   mediaUrl: ${mediaUrl || 'none'}`);
    console.log(`   priority: ${priority || 'normal'}`);

    if (!number || !message) {
      console.log(`❌ [controller:send] Validation failed: missing number or message`);
      return res.status(400).json({ success: false, error: 'Number and message are required' });
    }

    // Check WhatsApp is connected
    const state = whatsappService.getState(userId);
    console.log(`   WhatsApp state: connected=${state.connected}`);

    if (!state.connected) {
      console.log(`❌ [controller:send] WhatsApp not connected for user ${userId}`);
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not connected. Call POST /api/whatsapp/connect first.',
      });
    }

    // Get user plan
    const user = req.user;
    const plan = user?.plan || 'free';
    console.log(`   user plan: ${plan}`);

    // Update plan cache for rate limiter
    rateLimiter.setPlan(userId, plan);

    // Create DB log entry
    console.log(`\n📝 [controller:send] Creating DB log entry...`);
    const logEntry = await messageService.logMessage(userId, {
      to: number,
      body: message,
      mediaUrl,
    });
    console.log(`   messageLogId: ${logEntry?._id?.toString() || 'N/A'}`);

    // Add to global queue with rate limit + burst check + priority
    console.log(`\n📬 [controller:send] Adding job to queue...`);
    const job = await queueService.addMessage(userId, {
      to: number,
      body: message,
      mediaUrl,
      messageLogId: logEntry?._id?.toString() || null,
      plan,
      priority: priority || 'normal',
    });

    console.log(`\n✅ [controller:send] ✅ MESSAGE QUEUED SUCCESSFULLY`);
    console.log(`   job.id: ${job.id}`);
    console.log(`   messageLogId: ${logEntry?._id?.toString() || null}`);
    console.log(`═══════════════════════════════════════════════\n`);

    // Get queue position
    let queuePosition = 0;
    try {
      queuePosition = await queueService.getUserQueuePosition(userId);
    } catch (posErr) {
      console.warn(`⚠️  Could not get queue position: ${posErr.message}`);
    }

    res.json({
      success: true,
      message: 'Message queued',
      jobId: job.id,
      messageLogId: logEntry?._id?.toString() || null,
      queuePosition,
    });
  } catch (err) {
    console.error(`\n❌ [controller:send] ❌ ERROR: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);

    if (err.code === 'RATE_LIMITED') {
      console.log(`❌ [controller:send] Rate limited`);
      return res.status(429).json({
        success: false,
        error: err.message,
        code: 'RATE_LIMITED',
        retryAfter: err.retryAfter,
        limit: err.limit,
        current: err.current,
      });
    }
    if (err.code === 'BURST_LIMITED') {
      console.log(`❌ [controller:send] Burst limited`);
      return res.status(429).json({
        success: false,
        error: err.message,
        code: 'BURST_LIMITED',
      });
    }
    if (err.code === 'DUPLICATE_MESSAGE') {
      console.warn(`⚠️  [controller:send] Duplicate message blocked`);
      return res.status(409).json({
        success: false,
        error: err.message,
        code: 'DUPLICATE_MESSAGE',
      });
    }
    if (err.code === 'QUEUE_UNAVAILABLE') {
      console.error(`❌ [controller:send] Queue unavailable (Redis down)`);
      return res.status(503).json({
        success: false,
        error: err.message,
        code: 'QUEUE_UNAVAILABLE',
      });
    }
    console.error('❌ [messages:send]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/messages/logs
// ============================================================
exports.logs = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status || null;

    const messages = await messageService.getMessages(userId, { limit, status });
    res.json({ success: true, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/messages/stats
// ============================================================
exports.stats = async (req, res) => {
  try {
    const userId = req.userId;
    const plan = req.user?.plan || 'free';

    const [dbStats, queueStats, currentUsage] = await Promise.all([
      messageService.getStats(userId),
      queueService.getQueueStats(),
      rateLimiter.getUsage(userId),
    ]);

    res.json({
      success: true,
      db: dbStats,
      queue: queueStats,
      plan,
      rateLimit: {
        limit: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
        usedLastMinute: currentUsage,
        remaining: Math.max(0, (PLAN_LIMITS[plan] || PLAN_LIMITS.free) - currentUsage),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/messages/queue
// ============================================================
exports.queue = async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await queueService.getQueueStats();
    const position = await queueService.getUserQueuePosition(userId);
    res.json({ success: true, queue: stats, yourPosition: position });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
