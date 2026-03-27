'use strict';

const { Worker } = require('bullmq');
const whatsappService = require('../services/whatsappService');
const messageService = require('../services/messageService');
const rateLimiter = require('../utils/rateLimiter');
const sendingDelay = require('../utils/sendingDelay');
const campaignService = require('../services/campaignService');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;

const REDIS_CONFIG = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
};

const QUEUE_NAME = 'message-scheduler';

// ============================================================
// WORKER HARDENING: UNHANDLED EXCEPTION HANDLERS
// ============================================================
process.on('unhandledRejection', (reason) => {
  console.error('\n❌❌❌ [WORKER:UNHANDLED REJECTION] ❌❌❌');
  console.error(`   Reason: ${reason?.message || reason}`);
  console.error(`   Stack: ${reason?.stack || 'no stack'}`);
  console.error(`   Time: ${new Date().toISOString()}`);
});

process.on('uncaughtException', (err) => {
  console.error('\n❌❌❌ [WORKER:UNCAUGHT EXCEPTION] ❌❌❌');
  console.error(`   Error: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
  console.error(`   Time: ${new Date().toISOString()}`);
  process.exit(1);
});

console.log(`\n═══════════════════════════════════════════════`);
console.log(`🚀 [worker] STARTING GLOBAL WORKER`);
console.log(`   Queue: ${QUEUE_NAME}`);
console.log(`   Redis: ${REDIS_HOST}:${REDIS_PORT}`);
console.log(`═══════════════════════════════════════════════`);

// ============================================================
// GLOBAL WORKER — single, shared, handles all user jobs
// ============================================================
const GLOBAL_WORKER = new Worker(QUEUE_NAME, async (job) => {
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`📥 [worker:job] JOB RECEIVED`);
  console.log(`   job.id: ${job.id}`);
  console.log(`   job.name: ${job.name}`);
  console.log(`   job.attemptsMade: ${job.attemptsMade}`);
  console.log(`   job.timestamp: ${job.timestamp}`);
  console.log(`═══════════════════════════════════════════════`);

  if (job.name === 'campaign-message') {
    return await processCampaignJob(job);
  }

  // Handle 'send-message' and any other direct jobs
  return await processDirectJob(job);
}, {
  connection: REDIS_CONFIG,
  concurrency: 10,
  limiter: {
    max: 20,
    duration: 1000, // max 20 jobs per second
  },
});

// ============================================================
// FORMAT PHONE
// ============================================================
function formatNumber(number) {
  const cleaned = String(number).replace(/\D/g, '');
  if (cleaned.length > 10) return `${cleaned}@c.us`;
  return `91${cleaned}@c.us`;
}

// ============================================================
// SEND CORE — shared by both job types
// ============================================================
async function sendWhatsApp(client, chatId, body, mediaUrl) {
  console.log(`\n📤 [worker:sendWhatsApp] SENDING WHATSAPP MESSAGE`);
  console.log(`   chatId: ${chatId}`);
  console.log(`   body: ${body.substring(0, 50)}...`);
  console.log(`   mediaUrl: ${mediaUrl || 'none'}`);

  if (mediaUrl) {
    return await client.sendMessage(chatId, body, { media: mediaUrl });
  } else {
    return await client.sendMessage(chatId, body);
  }
}

// ============================================================
// PROCESS DIRECT MESSAGE JOB
// ============================================================
async function processDirectJob(job) {
  const { userId, to, body, mediaUrl, messageLogId, priority } = job.data;
  const attempt = (job.attemptsMade || 0) + 1;
  const plan = rateLimiter.getPlan(userId);

  console.log(`\n📥 [worker:processDirectJob] PROCESSING DIRECT MESSAGE`);
  console.log(`   job.id: ${job.id}`);
  console.log(`   userId: ${userId}`);
  console.log(`   to: ${to}`);
  console.log(`   body: ${body.substring(0, 80)}${body.length > 80 ? '...' : ''}`);
  console.log(`   mediaUrl: ${mediaUrl || 'none'}`);
  console.log(`   attempt: ${attempt}`);
  console.log(`   priority: ${priority}`);

  try {
    // Update DB: sending
    await messageService.updateStatusByJobId(userId, job.id, 'sending', { attempts: attempt });

    // Get user's WhatsApp client
    const client = whatsappService.getClient(userId);

    if (!client) {
      throw new Error(`WhatsApp client not initialized for user ${userId}. Ask user to reconnect.`);
    }

    if (!client.info) {
      throw new Error('WhatsApp client not ready yet. Try again in a moment.');
    }

    const chatId = formatNumber(to);

    // Apply rate limiting delay
    await sendingDelay.applySendingDelay(userId, plan);

    // Send the message
    console.log(`\n📤 [worker:processDirectJob] SENDING MESSAGE TO WHATSAPP`);
    let result;
    try {
      result = await sendWhatsApp(client, chatId, body, mediaUrl);
    } catch (err) {
      console.error(`❌ [worker:processDirectJob] Send error: ${err.message}`);
      await messageService.updateStatusByJobId(userId, job.id, 'failed', {
        error: err.message,
        attempts: attempt,
      });

      // Check if retryable
      if (!sendingDelay.isRetryableError(err.message)) {
        throw Object.assign(new Error(`Non-retryable: ${err.message}`), { retryable: false });
      }
      throw err;
    }

    const messageId = typeof result === 'string' ? result : (result?.id?._serialized || String(result));

    // Update DB: sent
    await messageService.updateStatusByJobId(userId, job.id, 'sent', {
      whatsappMessageId: messageId,
      sentAt: new Date(),
      attempts: attempt,
    });

    // Record rate limit
    await rateLimiter.recordSent(userId);
    sendingDelay.recordSent(userId);

    console.log(`\n✅ [worker:processDirectJob] ✅ MESSAGE SENT SUCCESSFULLY`);
    console.log(`   job.id: ${job.id}`);
    console.log(`   messageId: ${messageId}`);
    console.log(`   to: ${to}`);

    return { success: true, messageId, to, userId, jobId: job.id };

  } catch (err) {
    console.error(`\n❌ [worker:processDirectJob] ❌ JOB FAILED`);
    console.error(`   job.id: ${job.id}`);
    console.error(`   error: ${err.message}`);
    console.error(`   retryable: ${err.retryable !== false}`);

    await messageService.updateStatusByJobId(userId, job.id, 'failed', {
      error: err.message,
      attempts: attempt,
    });

    throw err;
  }
}

// ============================================================
// PROCESS CAMPAIGN MESSAGE JOB
// ============================================================
async function processCampaignJob(job) {
  const { campaignId, userId, to, body, mediaUrl, contactId } = job.data;
  const attempt = (job.attemptsMade || 0) + 1;

  console.log(`\n📥 [worker:processCampaignJob] PROCESSING CAMPAIGN MESSAGE`);
  console.log(`   job.id: ${job.id}`);
  console.log(`   campaignId: ${campaignId}`);
  console.log(`   userId: ${userId}`);
  console.log(`   to: ${to}`);
  console.log(`   attempt: ${attempt}`);

  const client = whatsappService.getClient(userId);
  if (!client || !client.info) {
    await campaignService.incrementCampaignFailed(campaignId);
    throw Object.assign(new Error(`WhatsApp not ready for user ${userId}`), { retryable: false });
  }

  // Campaign delay: extra safe delay (3-8s) to prevent spam detection
  await sendingDelay.sleep(3000 + Math.floor(Math.random() * 5000));

  let result;
  try {
    result = await sendWhatsApp(client, formatNumber(to), body, mediaUrl);
  } catch (err) {
    console.error(`❌ [worker] Campaign send error: ${err.message}`);
    await campaignService.incrementCampaignFailed(campaignId);

    if (!sendingDelay.isRetryableError(err.message)) {
      throw Object.assign(new Error(`Non-retryable: ${err.message}`), { retryable: false });
    }
    throw err;
  }

  const messageId = typeof result === 'string' ? result : (result?.id?._serialized || String(result));

  await campaignService.incrementCampaignSent(campaignId);
  await rateLimiter.recordSent(userId);
  sendingDelay.recordSent(userId);

  console.log(`✅ [worker] Campaign msg sent to ${to} | campaign:${campaignId}`);
  return { success: true, messageId, to, userId, campaignId, jobId: job.id };
}

// ============================================================
// EVENT HANDLERS
// ============================================================
GLOBAL_WORKER.on('ready', () => {
  console.log(`\n✅ [worker] ✅ GLOBAL WORKER READY`);
  console.log(`   Queue: ${QUEUE_NAME}`);
  console.log(`   Concurrency: 10`);
  console.log(`   Waiting for jobs...\n`);
});

GLOBAL_WORKER.on('completed', (job) => {
  console.log(`✅ [worker:event] Job ${job.id} completed in ${job.processingTime || 0}ms`);
});

GLOBAL_WORKER.on('failed', async (job, err) => {
  console.error(`\n❌ [worker:event] ❌ JOB FAILED`);
  console.error(`   job.id: ${job?.id}`);
  console.error(`   error: ${err.message}`);

  if (job) {
    // Try to update message status
    try {
      await messageService.updateStatusByJobId(job.data.userId, job.id, 'failed', {
        error: err.message,
        attempts: (job.attemptsMade || 0) + 1,
      });
    } catch (updateErr) {
      console.error(`   (Failed to update DB: ${updateErr.message})`);
    }

    // If campaign job, update campaign
    if (job.data.campaignId) {
      try {
        await campaignService.incrementCampaignFailed(job.data.campaignId);
      } catch (campErr) {
        console.error(`   (Failed to update campaign: ${campErr.message})`);
      }
    }
  }
});

GLOBAL_WORKER.on('error', (err) => {
  console.error(`\n❌ [worker:event] ❌ WORKER ERROR: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
});

GLOBAL_WORKER.on('stalled', (id) => {
  console.warn(`⚠️  [worker:event] Stalled job: ${id}`);
});

GLOBAL_WORKER.on('progress', ({ jobId, progress }) => {
  console.log(`📊 [worker:event] Job ${jobId} progress: ${progress}%`);
});

console.log(`🔧 [worker] Worker instance created, waiting for ready event...`);

module.exports = GLOBAL_WORKER;
