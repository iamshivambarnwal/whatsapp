'use strict';

/**
 * Anti-ban sending delay engine
 * Simulates human-like sending behavior
 */

// ============================================================
// COOLDOWN MAP: per-user last-sent timestamps
// ============================================================
const cooldowns = new Map(); // userId -> timestamp

const COOLDOWN_MS = {
  free: 8000,       // 8 seconds between messages
  starter: 5000,    // 5 seconds
  pro: 2000,        // 2 seconds
  enterprise: 500,  // 0.5 seconds
};

// ============================================================
// WAIT UNTIL COOLDOWN EXPIRES
// Returns time to wait in ms
// ============================================================
function getCooldownRemaining(userId, plan = 'free') {
  const lastSent = cooldowns.get(userId) || 0;
  const cooldown = COOLDOWN_MS[plan] || COOLDOWN_MS.free;
  const elapsed = Date.now() - lastSent;
  return Math.max(0, cooldown - elapsed);
}

// ============================================================
// APPLY COOLDOWN WAIT
// ============================================================
async function waitForCooldown(userId, plan = 'free') {
  const remaining = getCooldownRemaining(userId, plan);
  if (remaining > 0) {
    await sleep(remaining);
  }
}

// ============================================================
// RECORD MESSAGE SENT (update cooldown tracker)
// ============================================================
function recordSent(userId) {
  cooldowns.set(userId, Date.now());
}

// ============================================================
// RANDOM ANTI-BAN DELAY
// Base delay + random jitter
// ============================================================
function getRandomDelay(plan = 'free') {
  const base = {
    free: 3000,       // 3 seconds base
    starter: 2000,     // 2 seconds
    pro: 1000,        // 1 second
    enterprise: 500,  // 0.5 seconds
  }[plan] || 3000;

  // Random jitter: 0–50% of base
  const jitter = Math.random() * base * 0.5;
  return Math.floor(base + jitter);
}

// ============================================================
// SLEEP UTILITY
// ============================================================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// FULL ANTI-BAN DELAY PIPELINE
// Call before every send
// ============================================================
async function applySendingDelay(userId, plan = 'free') {
  // 1. Wait for cooldown
  await waitForCooldown(userId, plan);

  // 2. Random anti-ban delay
  const delay = getRandomDelay(plan);
  await sleep(delay);
}

// ============================================================
// CALCULATE BACKOFF DELAY (for retries)
// Exponential with randomness (never predictable)
// ============================================================
function getBackoffDelay(attempt) {
  // base: 2s, 4s, 8s, 16s, 32s
  const baseDelay = Math.min(32000, Math.pow(2, attempt) * 1000);
  // Add jitter: ±30%
  const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1);
  return Math.floor(baseDelay + jitter);
}

// ============================================================
// DETERMINE IF ERROR IS RETRYABLE
// ============================================================
function isRetryableError(errorMessage) {
  const retryable = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'timeout',
    'network',
    'temporary',
    'server error',
    'too many requests',
    'rate limit',
    'service unavailable',
    '503',
    '502',
    '429',
    'EAI_AGAIN',
    'socket hang up',
    'connection closed',
    'Protocol error',
  ];

  const nonRetryable = [
    'invalid',
    'not a contact',
    'number invalid',
    'must be a valid',
    'no such file',
    'auth failure',
    'token expired',
    'disconnected',
    'not connected',
    'cannot send message',
    'Message does not start',
    'AbortedError',
  ];

  const msg = String(errorMessage).toLowerCase();

  for (const pattern of nonRetryable) {
    if (msg.includes(pattern)) return false;
  }

  for (const pattern of retryable) {
    if (msg.includes(pattern)) return true;
  }

  return false; // Default: don't retry unknown errors
}

// ============================================================
// RESET COOLDOWN (call when client reconnects)
// ============================================================
function resetCooldown(userId) {
  cooldowns.delete(userId);
}

module.exports = {
  applySendingDelay,
  recordSent,
  getCooldownRemaining,
  waitForCooldown,
  getRandomDelay,
  getBackoffDelay,
  isRetryableError,
  resetCooldown,
  sleep,
  COOLDOWN_MS,
};
