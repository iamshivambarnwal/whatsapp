'use strict';

const { Queue, QueueEvents } = require('bullmq');
const rateLimiter = require('../utils/rateLimiter');

// ============================================================
// SINGLE GLOBAL QUEUE
// All users share one queue — job.data contains userId
// Priority sorting handled at add() time
// ============================================================
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;

const REDIS_CONFIG = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
};

const QUEUE_NAME = 'message-scheduler';

// Rate limits per plan (msgs per 60 seconds)
const PLAN_LIMITS = {
  free: 10,
  starter: 50,
  pro: 200,
  enterprise: 1000,
};

let _queue = null;
let _events = null;

// ============================================================
// QUEUE DEBUG LOGGER — log counts every 10 seconds
// ============================================================
let _queueDebugInterval = null;

function startQueueDebug() {
  if (_queueDebugInterval) return; // Already running
  _queueDebugInterval = setInterval(async () => {
    try {
      const stats = await getQueueStats();
      if (stats.waiting > 0 || stats.active > 0) {
        console.log(`\n🔍 [queue:debug] Queue heartbeat @ ${new Date().toISOString()}`);
        console.log(`   waiting:   ${stats.waiting}`);
        console.log(`   active:   ${stats.active}`);
        console.log(`   completed: ${stats.completed}`);
        console.log(`   failed:   ${stats.failed}`);
        console.log(`   delayed:  ${stats.delayed}`);
      }
    } catch (err) {
      console.warn(`⚠️  [queue:debug] Failed to log queue stats: ${err.message}`);
    }
  }, 10000);
}

function getQueue() {
  if (_queue) return _queue;

  console.log(`\n🔧 [queueService] Creating queue "${QUEUE_NAME}"`);
  console.log(`   Redis: ${REDIS_HOST}:${REDIS_PORT}`);

  _queue = new Queue(QUEUE_NAME, {
    connection: REDIS_CONFIG,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 3,
      backoff: {
        type: 'custom',
      },
    },
  });

  _events = new QueueEvents(QUEUE_NAME, { connection: REDIS_CONFIG });

  _events.on('completed', ({ jobId, returnvalue }) => {
    console.log(`✅ [queue:events] Job ${jobId} completed`);
  });

  _events.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ [queue:events] Job ${jobId} failed: ${failedReason}`);
  });

  _events.on('waiting', ({ jobId }) => {
    console.log(`⏳ [queue:events] Job ${jobId} is waiting`);
  });

  _events.on('active', ({ jobId }) => {
    console.log(`🚀 [queue:events] Job ${jobId} is now active (worker picked it up)`);
  });

  console.log(`✅ [queueService] Queue "${QUEUE_NAME}" created successfully`);
  return _queue;
}

// ============================================================
// REDIS CONNECTION CHECK — validate before any queue operation
// ============================================================
const { createClient } = require('redis');
const REDIS_URL = `redis://${REDIS_HOST}:${REDIS_PORT}`;
let _dedupClient = null;

async function getDedupClient() {
  if (_dedupClient && _dedupClient.isOpen) return _dedupClient;
  _dedupClient = createClient({ url: REDIS_URL });
  _dedupClient.on('error', (err) => console.error(`❌ [queue:dedup] Redis error: ${err.message}`));
  await _dedupClient.connect().catch((err) => console.error(`❌ [queue:dedup] Redis connect failed: ${err.message}`));
  return _dedupClient;
}

// ============================================================
// DUPLICATE JOB CHECK
// Prevents same message (userId + to + body hash) from being queued twice within 30 seconds
// ============================================================
async function isDuplicateMessage(userId, to, body) {
  try {
    const client = await getDedupClient();
    const hash = require('crypto').createHash('sha256').update(`${userId}:${to}:${body}`).digest('hex').slice(0, 16);
    const key = `dedup:${userId}:${hash}`;
    const exists = await client.exists(key);
    if (exists) {
      console.warn(`⚠️  [queue:addMessage] DUPLICATE BLOCKED — userId=${userId} to=${to} hash=${hash}`);
      return true;
    }
    // Set expiry 30 seconds
    await client.setEx(key, 30, '1');
    return false;
  } catch (err) {
    console.warn(`⚠️  [queue:addMessage] Dedup check failed (allowing through): ${err.message}`);
    return false; // Fail open — allow through if Redis is down
  }
}

// ============================================================
// REDIS ALIVE CHECK
// ============================================================
async function isRedisAlive() {
  try {
    const client = await getDedupClient();
    await client.ping();
    return true;
  } catch (err) {
    console.error(`❌ [queueService] Redis is DOWN: ${err.message}`);
    return false;
  }
}

// ============================================================
// ADD MESSAGE TO QUEUE
// Priority: 'high' → sorted score = 1
//            'normal' → sorted score = 2  (processed after high)
// Both go to same queue; BullMQ prioritizes lower score first
// ============================================================
async function addMessage(userId, { to, body, mediaUrl, messageLogId, plan = 'free', priority = 'normal' }) {
  // ============================================================
  // 1. REDIS AVAILABILITY CHECK — fail fast if Redis is down
  // ============================================================
  const redisAlive = await isRedisAlive();
  if (!redisAlive) {
    const error = new Error('Message queue unavailable (Redis is down). Please try again in a moment.');
    error.code = 'QUEUE_UNAVAILABLE';
    throw error;
  }

  // ============================================================
  // 2. DUPLICATE CHECK — prevent accidental double-queueing
  // ============================================================
  const isDup = await isDuplicateMessage(userId, to, body);
  if (isDup) {
    const error = new Error('Duplicate message detected. Please wait a moment before sending the same message again.');
    error.code = 'DUPLICATE_MESSAGE';
    throw error;
  }

  // ============================================================
  // 3. HARD RATE LIMIT CHECK — reject before queuing
  // ============================================================
  const limitCheck = await rateLimiter.checkRateLimit(userId, plan);

  if (!limitCheck.allowed) {
    const error = new Error(`Rate limit exceeded. You have sent ${limitCheck.current}/${limitCheck.limit} messages in the last minute. Retry in ${limitCheck.retryAfter}s.`);
    error.code = 'RATE_LIMITED';
    error.retryAfter = limitCheck.retryAfter;
    error.limit = limitCheck.limit;
    error.current = limitCheck.current;
    throw error;
  }

  // ============================================================
  // 4. BURST PROTECTION — strict 10-second window
  // ============================================================
  const burstCheck = await rateLimiter.checkBurstLimit(userId, 3);
  if (!burstCheck.allowed) {
    const error = new Error(`Too many messages in a short burst. Please wait a moment.`);
    error.code = 'BURST_LIMITED';
    throw error;
  }

  const queue = getQueue();

  // ============================================================
  // 5. BUILD JOB ID
  // ============================================================
  const jobId = `msg-${userId}-${Date.now()}-${to.replace(/\D/g, '').slice(-6)}`;

  // Priority score: lower = higher priority (BullMQ sorts ascending)
  const priorityScore = priority === 'high' ? 1 : 2;

  console.log(`\n📬 [queue:addMessage] ADDING JOB TO QUEUE`);
  console.log(`   Queue name: ${QUEUE_NAME}`);
  console.log(`   Job ID: ${jobId}`);
  console.log(`   userId: ${userId}`);
  console.log(`   to: ${to}`);
  console.log(`   body: ${body.substring(0, 50)}...`);
  console.log(`   mediaUrl: ${mediaUrl || 'none'}`);
  console.log(`   priority: ${priority} (score: ${priorityScore})`);

  const job = await queue.add('send-message', {
    userId,
    to,
    body,
    mediaUrl: mediaUrl || null,
    messageLogId: messageLogId || null,
    priority,
    queuedAt: new Date().toISOString(),
  }, {
    jobId,
    priority: priorityScore,
  });

  console.log(`✅ [queue:addMessage] Job ${job.id} ADDED to queue "${QUEUE_NAME}"`);

  // Log queue counts post-insert
  try {
    const stats = await getQueueStats();
    console.log(`   Queue snapshot → waiting: ${stats.waiting} | active: ${stats.active} | failed: ${stats.failed}`);
  } catch (statErr) {
    console.warn(`   (Could not log queue snapshot: ${statErr.message})`);
  }

  return job;
}

// ============================================================
// ADD HIGH PRIORITY MESSAGE
// ============================================================
async function addHighPriorityMessage(userId, data) {
  console.log(`🔺 [queue:addHighPriorityMessage] Adding high priority message for user ${userId}`);
  return addMessage(userId, { ...data, priority: 'high' });
}

// ============================================================
// ADD CAMPAIGN JOB
// Uses slightly lower priority than direct messages
// (priority 3) to let direct messages take precedence
// ============================================================
async function addCampaignJob(campaignId, userId, { to, body, mediaUrl, contactId, contactName }) {
  const queue = getQueue();

  const jobId = `camp-${campaignId}-${Date.now()}-${to.replace(/\D/g, '').slice(-6)}`;

  console.log(`\n📬 [queue:addCampaignJob] ADDING CAMPAIGN JOB`);
  console.log(`   Job ID: ${jobId}`);
  console.log(`   campaignId: ${campaignId}`);
  console.log(`   userId: ${userId}`);
  console.log(`   to: ${to}`);

  const job = await queue.add('campaign-message', {
    campaignId,
    userId,
    to,
    body,
    mediaUrl: mediaUrl || null,
    contactId: contactId || null,
    contactName: contactName || null,
    isCampaign: true,
    queuedAt: new Date().toISOString(),
  }, {
    jobId,
    priority: 3,
    removeOnComplete: 20,
    removeOnFail: 50,
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
  });

  console.log(`✅ [queue:addCampaignJob] Campaign job ${job.id} queued`);
  return job;
}

// ============================================================
// GET QUEUE STATS
// ============================================================
async function getQueueStats() {
  const queue = getQueue();
  try {
    const counts = await queue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  } catch (err) {
    console.error('❌ [queueService] getQueueStats error:', err.message);
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
}

// ============================================================
// GET USER'S QUEUE POSITION (approximate)
// ============================================================
async function getUserQueuePosition(userId) {
  const queue = getQueue();
  try {
    const waiting = await queue.getWaiting();
    const userJobs = waiting.filter((j) => j.data.userId === userId);
    return userJobs.length;
  } catch (err) {
    return 0;
  }
}

// ============================================================
// CLOSE QUEUE
// ============================================================
async function closeQueue() {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
  if (_events) {
    await _events.close();
    _events = null;
  }
  console.log('✅ [queueService] Global queue closed');
}

module.exports = {
  getQueue,
  addMessage,
  addHighPriorityMessage,
  addCampaignJob,
  getQueueStats,
  getUserQueuePosition,
  closeQueue,
  startQueueDebug,
  PLAN_LIMITS,
};
