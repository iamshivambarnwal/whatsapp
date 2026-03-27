'use strict';

/**
 * Redis-based sliding window rate limiter
 * Enforces hard rate limits per user before jobs enter the queue
 * 
 * IMPORTANT: Uses same Redis config as BullMQ for consistency
 */
const { createClient } = require('redis');

// Use the same Redis connection as BullMQ (host + port)
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;

// Build Redis URL from host + port (same format as BullMQ)
const REDIS_URL = `redis://${REDIS_HOST}:${REDIS_PORT}`;

console.log(`🔧 [rateLimiter] Connecting to Redis: ${REDIS_URL}`);

const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => {
  console.error(`❌ [rateLimiter] Redis client error: ${err.message}`);
});

redis.on('connect', () => {
  console.log(`✅ [rateLimiter] Redis client connected`);
});

redis.on('ready', () => {
  console.log(`✅ [rateLimiter] Redis client ready`);
});

// Plan rate limits (messages per 60 seconds)
const PLAN_LIMITS = {
  free: 10,
  starter: 50,
  pro: 200,
  enterprise: 1000,
};

// In-memory cache of last known plan per user (updated on queue check)
const planCache = new Map(); // userId -> plan

async function ensureConnected() {
  if (!redis.isOpen) {
    console.log(`🔌 [rateLimiter] Redis not connected, connecting...`);
    await redis.connect().catch((err) => {
      console.error(`❌ [rateLimiter] Failed to connect to Redis: ${err.message}`);
    });
  }
}

// ============================================================
// SLIDING WINDOW RATE LIMIT CHECK
// Uses Redis sorted sets with timestamp scores
// Window: 60 seconds, limit per plan
// ============================================================
async function checkRateLimit(userId, plan = 'free') {
  await ensureConnected();

  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - 60000; // 60 second window

  try {
    const pipeline = redis.multi();

    // Remove expired entries outside window
    pipeline.zRemRangeByScore(key, 0, windowStart);

    // Count entries in current window
    pipeline.zCard(key);

    const results = await pipeline.exec();
    const count = results[1];

    console.log(`📊 [rateLimiter] checkRateLimit for ${userId} (plan: ${plan})`);
    console.log(`   limit: ${limit}, current: ${count}, allowed: ${count < limit}`);

    if (count >= limit) {
      return {
        allowed: false,
        limit,
        current: count,
        retryAfter: 60, // seconds until oldest entry expires
      };
    }

    return { allowed: true, limit, current: count };
  } catch (err) {
    // If Redis fails, allow the request (fail open)
    console.warn(`⚠️ [rateLimiter] Redis error, allowing request: ${err.message}`);
    return { allowed: true, limit, current: 0 };
  }
}

// ============================================================
// RECORD A MESSAGE SENT (adds to sliding window)
// Call this AFTER the message is actually sent successfully
// ============================================================
async function recordSent(userId) {
  await ensureConnected();
  const key = `ratelimit:${userId}`;
  const now = Date.now();

  try {
    // Add timestamp as both score and member (unique)
    await redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    // Auto-expire key after 2 minutes (cleanup)
    await redis.expire(key, 120);
    console.log(`✅ [rateLimiter] Recorded sent for ${userId}`);
  } catch (err) {
    console.warn(`⚠️ [rateLimiter] recordSent error: ${err.message}`);
  }
}

// ============================================================
// GET CURRENT USAGE (for stats endpoint)
// ============================================================
async function getUsage(userId) {
  await ensureConnected();
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - 60000;

  try {
    await redis.zRemRangeByScore(key, 0, windowStart);
    const count = await redis.zCard(key);
    return count;
  } catch (err) {
    return 0;
  }
}

// ============================================================
// UPDATE PLAN CACHE
// ============================================================
function setPlan(userId, plan) {
  planCache.set(userId, plan);
}

function getPlan(userId) {
  return planCache.get(userId) || 'free';
}

// ============================================================
// BURST PROTECTION: Check recent message count (last 10 seconds)
// This is stricter than the 60s window
// ============================================================
async function checkBurstLimit(userId, maxBurst = 3) {
  await ensureConnected();
  const key = `burst:${userId}`;
  const now = Date.now();
  const windowStart = now - 10000; // 10 second window

  try {
    await redis.zRemRangeByScore(key, 0, windowStart);
    const count = await redis.zCard(key);

    console.log(`📊 [rateLimiter] checkBurstLimit for ${userId}`);
    console.log(`   maxBurst: ${maxBurst}, current: ${count}, allowed: ${count < maxBurst}`);

    if (count >= maxBurst) {
      return { allowed: false, burst: count, max: maxBurst };
    }

    await redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    await redis.expire(key, 15);
    return { allowed: true, burst: count, max: maxBurst };
  } catch (err) {
    console.warn(`⚠️ [rateLimiter] checkBurstLimit error: ${err.message}`);
    return { allowed: true, burst: 0, max: maxBurst };
  }
}

// ============================================================
// CLEANUP (call on shutdown)
// ============================================================
async function cleanup() {
  try {
    await redis.quit();
    console.log(`✅ [rateLimiter] Redis client closed`);
  } catch (_) {}
}

module.exports = {
  checkRateLimit,
  recordSent,
  getUsage,
  setPlan,
  getPlan,
  checkBurstLimit,
  cleanup,
  PLAN_LIMITS,
};
