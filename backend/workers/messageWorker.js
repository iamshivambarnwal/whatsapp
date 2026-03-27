'use strict';

const { Worker } = require('bullmq');
const whatsappService = require('../services/whatsappService');
const messageService = require('../services/messageService');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
};

// ============================================================
// FORMAT PHONE NUMBER
// ============================================================
function formatNumber(number) {
  const cleaned = String(number).replace(/\D/g, '');
  // Already has country code
  if (cleaned.length > 10) return `${cleaned}@c.us`;
  // Local number — assume India
  return `91${cleaned}@c.us`;
}

// ============================================================
// PROCESS A SINGLE MESSAGE JOB
// ============================================================
async function processJob(job) {
  const { userId, to, body, mediaUrl, messageLogId } = job.data;
  const attempt = job.attemptsMade + 1;

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`📥 [worker:${userId}] JOB RECEIVED — ${job.id}`);
  console.log(`   → ${to} | ${body.substring(0, 60)}${body.length > 60 ? '...' : ''}`);
  console.log(`   → Attempt ${attempt}/${job.opts.attempts || 3}`);
  console.log(`═══════════════════════════════════════════════`);

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

  // Send the message
  let result;
  if (mediaUrl) {
    result = await client.sendMessage(chatId, body, { media: mediaUrl });
  } else {
    result = await client.sendMessage(chatId, body);
  }

  const messageId = typeof result === 'string' ? result : (result?.id?._serialized || String(result));

  console.log(`✅ [worker:${userId}] Sent to ${to} | ID: ${messageId}`);

  // Update DB: sent
  await messageService.updateStatusByJobId(userId, job.id, 'sent', {
    whatsappMessageId: messageId,
    sentAt: new Date(),
  });

  return { success: true, messageId, to, userId };
}

// ============================================================
// CREATE A WORKER FOR A USER'S QUEUE
// ============================================================
function createWorker(userId) {
  const queueName = `messages_${userId}`;

  const worker = new Worker(queueName, async (job) => {
    return await processJob(job);
  }, {
    connection: REDIS_CONFIG,
    concurrency: 3,
  });

  worker.on('ready', () => {
    console.log(`✅ [worker:${userId}] Worker ready on queue: ${queueName}`);
  });

  worker.on('completed', async (job) => {
    console.log(`✅ [worker:${userId}] Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`❌ [worker:${userId}] Job ${job?.id} failed: ${err.message}`);
    if (job) {
      await messageService.updateStatusByJobId(userId, job.id, 'failed', {
        error: err.message,
      });
    }
  });

  worker.on('error', (err) => {
    console.error(`❌ [worker:${userId}] Worker error:`, err.message);
  });

  console.log(`🔧 [worker:${userId}] Creating worker for queue: ${queueName}`);
  return worker;
}

module.exports = { createWorker };
