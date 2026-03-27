'use strict';

const webhookService = require('../services/webhookService');
const usageService = require('../services/usageService');

exports.createWebhook = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, url, events, headers } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Plan check
    const check = await usageService.checkWebhookAllowed(userId);
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error });
    }

    const webhook = await webhookService.createWebhook(userId, { name, url, events, headers });
    res.status(201).json({ success: true, webhook });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listWebhooks = async (req, res) => {
  try {
    const webhooks = await webhookService.getWebhooks(req.userId);
    res.json({ success: true, count: webhooks.length, webhooks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    await webhookService.deleteWebhook(req.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};

exports.createRule = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, trigger, matchMode, replyMessage, replyMediaUrl, priority } = req.body;

    if (!name || !trigger || !replyMessage) {
      return res.status(400).json({ success: false, error: 'name, trigger, replyMessage required' });
    }

    // Plan check
    const check = await usageService.checkAutomationAllowed(userId);
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error });
    }

    const rule = await webhookService.createRule(userId, {
      name, trigger, matchMode, replyMessage, replyMediaUrl, priority,
    });
    res.status(201).json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listRules = async (req, res) => {
  try {
    const rules = await webhookService.getRules(req.userId);
    res.json({ success: true, count: rules.length, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    await webhookService.deleteRule(req.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};
