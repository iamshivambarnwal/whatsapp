'use strict';

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const messageService = require('./messageService');
const webhookService = require('./webhookService');

// ============================================================
// PER-USER WHATSAPP CLIENT MAP
// ============================================================
const clients = new Map(); // userId -> { client, state, sessionAge }
const initializing = new Set(); // userIds currently being initialized
const INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getSessionPath(userId) {
  return path.join(__dirname, '../.wwebjs_auth', `user_${userId}`);
}

// ============================================================
// INITIALIZE CLIENT FOR A USER
// ============================================================
async function initializeClient(userId) {
  // Guard: prevent concurrent initialization for same user
  if (initializing.has(userId)) {
    console.log(`📱 [whatsapp:${userId}] Already initializing, skipping duplicate call`);
    return clients.has(userId) ? clients.get(userId).client : null;
  }

  if (clients.has(userId)) {
    const entry = clients.get(userId);
    if (entry.state.connected) return entry.client;
    // Already has a client entry but not connected — destroy old one first
    try { entry.client.destroy(); } catch (_) {}
    clients.delete(userId);
  }

  initializing.add(userId);

  const sessionPath = getSessionPath(userId);
  console.log(`📱 [whatsapp:${userId}] Initializing — path: ${sessionPath}`);

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  const state = {
    connected: false,
    qr: null,
    qrUpdatedAt: null,
    userId,
    sessionAge: Date.now(),
  };

  // --- QR Event ---
  client.on('qr', async (qr) => {
    try {
      state.qr = await QRCode.toDataURL(qr);
      state.qrUpdatedAt = new Date();
      state.connected = false;
      console.log(`📱 [whatsapp:${userId}] QR generated`);
    } catch (err) {
      console.error(`❌ [whatsapp:${userId}] QR error: ${err.message}`);
    }
  });

  // --- Ready Event ---
  client.on('ready', () => {
    state.connected = true;
    state.qr = null;
    state.sessionAge = Date.now();
    console.log(`✅ [whatsapp:${userId}] Session ready`);
  });

  // --- Message Ack Event (delivery tracking) ---
  client.on('message_ack', async (msg, ack) => {
    try {
      const status = mapAckToStatus(ack);
      if (!status) return;

      await messageService.updateStatusByMessageId(msg.id._serialized, status);
      console.log(`📬 [whatsapp:${userId}] Msg ${msg.id._serialized} → ${status}`);
    } catch (err) {
      // Silent — don't crash on tracking failures
    }
  });

  // --- Incoming Message — trigger webhooks + automation ---
  client.on('message', async (msg) => {
    if (msg.fromMe) return; // Ignore outgoing

    const payload = {
      from: msg.from,
      fromMe: false,
      body: msg.body,
      timestamp: msg.timestamp,
      hasMedia: msg.hasMedia,
      messageId: msg.id._serialized,
    };

    console.log(`📥 [whatsapp:${userId}] Incoming from ${msg.from}: ${msg.body.substring(0, 50)}`);

    // Fire webhooks asynchronously (non-blocking)
    webhookService.triggerWebhooks(userId, 'message_received', payload).catch(() => {});

    // Check automation rules and send auto-reply if matched
    const rule = await webhookService.checkAutomationRules(userId, { body: msg.body });
    if (rule) {
      // Queue auto-reply via the global queue (low priority)
      const queueService = require('./queueService');
      queueService.addHighPriorityMessage(userId, {
        to: msg.from.replace('@c.us', '').replace('@g.us', ''),
        body: rule.replyMessage,
        mediaUrl: rule.replyMediaUrl,
      }).catch(() => {});
    }
  });

  // --- Disconnected Event ---
  client.on('disconnected', (reason) => {
    console.warn(`⚠️  [whatsapp:${userId}] Disconnected: ${reason}`);
    state.connected = false;
    clients.delete(userId);
  });

  // --- Auth Failure ---
  client.on('auth_failure', (msg) => {
    console.error(`❌ [whatsapp:${userId}] Auth failure: ${msg}`);
    state.connected = false;
    clients.delete(userId);
  });

  clients.set(userId, { client, state });

  // Initialize async (don't block)
  client.initialize().catch((err) => {
    console.error(`❌ [whatsapp:${userId}] Init error: ${err.message}`);
    clients.delete(userId);
  });

  return client;
}

// ============================================================
// MAP WHATSAPP ACK LEVEL TO STATUS STRING
// ack: 0=ERROR, 1=PENDING, 2=SERVER, 3=DELIVERED, 4=VIEWED
// ============================================================
function mapAckToStatus(ack) {
  const map = {
    0: 'failed',    // Error
    1: 'sent',      // Pending (sent to server)
    2: 'sent',      // Server received
    3: 'delivered', // Delivered to phone
    4: 'read',      // Read by recipient
  };
  return map[ack] || null;
}

// ============================================================
// GET CLIENT
// ============================================================
function getClient(userId) {
  const entry = clients.get(userId);
  return entry ? entry.client : null;
}

// ============================================================
// GET STATE
// ============================================================
function getState(userId) {
  const entry = clients.get(userId);
  if (!entry) return { connected: false, qr: null };
  return {
    connected: entry.state.connected,
    qr: entry.state.qr,
    qrUpdatedAt: entry.state.qrUpdatedAt,
  };
}

// ============================================================
// GET CLIENT READY STATE (safe — checks client + info)
// Returns { ready: boolean, reason?: string }
// ============================================================
function getClientReady(userId) {
  const entry = clients.get(userId);
  if (!entry) {
    return { ready: false, reason: `No WhatsApp client found for user ${userId}. User must call POST /api/whatsapp/connect first.` };
  }
  if (!entry.state.connected) {
    return { ready: false, reason: `WhatsApp not connected for user ${userId}. State: connected=${entry.state.connected}` };
  }
  if (!entry.client.info) {
    return { ready: false, reason: `WhatsApp client initializing for user ${userId}. Please wait a moment and try again.` };
  }
  return { ready: true };
}

// ============================================================
// GET CLIENT STATUS (full diagnostic)
// ============================================================
function getClientStatus(userId) {
  const entry = clients.get(userId);
  if (!entry) {
    return { exists: false, connected: false, hasInfo: false, sessionAge: null, memory: null };
  }
  return {
    exists: true,
    connected: entry.state.connected,
    hasInfo: !!entry.client.info,
    sessionAge: Date.now() - entry.state.sessionAge,
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}

// ============================================================
// HAS CLIENT
// ============================================================
function hasClient(userId) {
  return clients.has(userId);
}

// ============================================================
// MEMORY LEAK CHECK — log if too many clients stored
// ============================================================
function checkMemorySafety() {
  const total = clients.size;
  if (total > 50) {
    console.warn(`⚠️  [whatsapp] WARNING: ${total} clients stored in memory (possible memory leak)`);
    console.warn(`   Clients:`, [...clients.keys()].join(', '));
  }
  return total;
}

// ============================================================
// DISCONNECT
// ============================================================
async function disconnectClient(userId) {
  const entry = clients.get(userId);
  if (!entry) return { message: 'No client found' };
  try { await entry.client.destroy(); } catch (_) {}
  clients.delete(userId);
  console.log(`🔌 [whatsapp:${userId}] Disconnected`);
  return { message: 'Disconnected', userId };
}

// ============================================================
// RECONNECT
// ============================================================
async function reconnectClient(userId) {
  await disconnectClient(userId);
  return initializeClient(userId);
}

// ============================================================
// GET ACTIVE CLIENTS
// ============================================================
function getActiveClients() {
  const active = [];
  for (const [uid, entry] of clients) {
    active.push({ userId: uid, connected: entry.state.connected });
  }
  return active;
}

// ============================================================
// SESSION CLEANUP — removes inactive clients
// Call this on an interval (e.g., every 10 minutes)
// ============================================================
function cleanupInactiveSessions() {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, entry] of clients) {
    if (entry.state.connected) continue; // Don't remove active sessions
    if (now - entry.state.sessionAge > INACTIVE_TIMEOUT_MS) {
      entry.client.destroy().catch(() => {});
      clients.delete(userId);
      cleaned++;
    }
  }

  if (cleaned > 0) console.log(`🧹 [whatsapp] Cleaned ${cleaned} inactive sessions`);
}

module.exports = {
  initializeClient,
  getClient,
  getState,
  hasClient,
  getClientReady,
  getClientStatus,
  checkMemorySafety,
  disconnectClient,
  reconnectClient,
  getActiveClients,
  cleanupInactiveSessions,
  mapAckToStatus,
};
