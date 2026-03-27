'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');
const messageRoutes = require('./routes/messages');
const campaignRoutes = require('./routes/campaign');
const contactRoutes = require('./routes/contacts');
const webhookRoutes = require('./routes/webhooks');
const automationRoutes = require('./routes/automation');
const usageRoutes = require('./routes/usage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/usage', usageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ============================================================
// UNHANDLED EXCEPTION HANDLERS — BULLETPROOF
// ============================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌❌❌ [UNHANDLED REJECTION] ❌❌❌');
  console.error(`   Reason: ${reason?.message || reason}`);
  console.error(`   Stack: ${reason?.stack || 'no stack'}`);
  console.error('   Promise:', promise);
  console.error('   Time:', new Date().toISOString());
  console.error('   This will NOT crash the process — logging for debugging');
});

process.on('uncaughtException', (err, origin) => {
  console.error('\n❌❌❌ [UNCAUGHT EXCEPTION] ❌❌❌');
  console.error(`   Error: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
  console.error(`   Origin: ${origin}`);
  console.error(`   Time: ${new Date().toISOString()}`);
  console.error('   ⚠️  Uncaught exceptions are fatal — initiating graceful shutdown...');
  // Attempt graceful shutdown then hard exit
  gracefulShutdown('uncaughtException').then(() => process.exit(1)).catch(() => process.exit(1));
});

// ============================================================
// START SERVER
// ============================================================
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     WHATSAPP SAAS — FULL BUSINESS SUITE     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`🚀 http://localhost:${PORT}`);
  console.log('🔐 Auth:  /api/auth/register, /api/auth/login');
  console.log('📱 WhatsApp: /api/whatsapp/{connect,status,disconnect}');
  console.log('📬 Messages: /api/messages/{send,logs,stats,queue}');
  console.log('📦 Campaigns: /api/campaign/{create,start,pause,list}');
  console.log('👥 Contacts:  /api/contacts/{upload,get}');
  console.log('🔗 Webhooks:  /api/webhooks/{create,list,delete}');
  console.log('🤖 Automation: /api/automation/{rule,rules}');
  console.log('📊 Usage:     /api/usage/me, /api/usage/limits');
  console.log('');
});

// ============================================================
// GLOBAL WORKER
// ============================================================
console.log('🔧 Starting global worker...');
const globalWorker = require('./workers/globalWorker');

// ============================================================
// SESSION CLEANUP (every 10 minutes)
// ============================================================
const whatsappService = require('./services/whatsappService');
setInterval(() => whatsappService.cleanupInactiveSessions(), 10 * 60 * 1000);

// ============================================================
// QUEUE DEBUG LOGGER — heartbeat every 10 seconds
// ============================================================
const queueService = require('./services/queueService');
queueService.startQueueDebug();

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
async function gracefulShutdown(signal) {
  console.log(`\n🔌 ${signal} — shutting down...`);
  try {
    await globalWorker.close();
    const queueService = require('./services/queueService');
    await queueService.closeQueue();
    const rateLimiter = require('./utils/rateLimiter');
    await rateLimiter.cleanup();
    whatsappService.getActiveClients().forEach(({ userId }) => whatsappService.disconnectClient(userId));
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  } catch (err) {
    console.error('❌ Shutdown error:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
