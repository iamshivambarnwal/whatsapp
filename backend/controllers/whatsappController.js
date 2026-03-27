'use strict';

const whatsappService = require('../services/whatsappService');

// ============================================================
// POST /api/whatsapp/connect
// Initializes WhatsApp client for the user
// Worker is now global — no per-user worker creation needed
// ============================================================
exports.connect = async (req, res) => {
  try {
    const userId = req.userId;
    await whatsappService.initializeClient(userId);

    res.json({
      success: true,
      message: 'WhatsApp initialization started. Poll GET /api/whatsapp/status for QR.',
    });
  } catch (err) {
    console.error('❌ [whatsapp:connect]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/whatsapp/status
// Returns QR code or connected status
// ============================================================
exports.status = async (req, res) => {
  try {
    const userId = req.userId;
    const state = whatsappService.getState(userId);

    if (state.connected) {
      return res.json({
        success: true,
        connected: true,
        qr: null,
        message: 'WhatsApp connected and ready',
      });
    }

    if (state.qr) {
      return res.json({
        success: true,
        connected: false,
        qr: state.qr,
        qrUpdatedAt: state.qrUpdatedAt,
        message: 'Scan the QR code to connect',
      });
    }

    res.json({
      success: true,
      connected: false,
      qr: null,
      message: 'Not initialized. Call POST /api/whatsapp/connect first.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// DELETE /api/whatsapp/disconnect
// ============================================================
exports.disconnect = async (req, res) => {
  try {
    const userId = req.userId;
    await whatsappService.disconnectClient(userId);
    res.json({ success: true, message: 'WhatsApp disconnected' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// GET /api/whatsapp/active  (admin)
// ============================================================
exports.getActiveClients = (req, res) => {
  const clients = whatsappService.getActiveClients();
  res.json({ success: true, activeClients: clients.length, clients });
};

module.exports = exports;
