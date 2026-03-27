'use strict';

/**
 * Webhook delivery + automation engine
 */
const Webhook = require('../models/Webhook');
const AutomationRule = require('../models/AutomationRule');
const axios = require('axios');
const crypto = require('crypto');

// ============================================================
// TRIGGER WEBHOOKS FOR AN EVENT
// Called from whatsappService when events fire
// ============================================================
async function triggerWebhooks(userId, event, payload) {
  const webhooks = await Webhook.find({ userId, active: true, events: event });

  await Promise.allSettled(
    webhooks.map((webhook) => deliverWebhook(webhook, event, payload))
  );
}

// ============================================================
// DELIVER A SINGLE WEBHOOK
// ============================================================
async function deliverWebhook(webhook, event, payload) {
  const body = {
    event,
    userId: webhook.userId.toString(),
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(body))
    .digest('hex');

  try {
    await axios.post(webhook.url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        ...Object.fromEntries(
          (webhook.headers || new Map()).entries()
        ),
      },
      timeout: 10000,
    });

    await Webhook.findByIdAndUpdate(webhook._id, {
      $inc: { successCount: 1 },
      lastTriggered: new Date(),
    });

    console.log(`✅ [webhook:${webhook._id}] Delivered ${event} to ${webhook.url}`);
  } catch (err) {
    await Webhook.findByIdAndUpdate(webhook._id, {
      $inc: { failureCount: 1 },
    });
    console.error(`❌ [webhook:${webhook._id}] Delivery failed: ${err.message}`);
  }
}

// ============================================================
// CHECK AUTOMATION RULES FOR INCOMING MESSAGE
// Returns the matched rule's reply, or null
// ============================================================
async function checkAutomationRules(userId, incomingMessage) {
  const rules = await AutomationRule.find({ userId, active: true })
    .sort({ priority: -1, createdAt: 1 });

  const text = (incomingMessage.body || '').toLowerCase().trim();

  for (const rule of rules) {
    const trigger = rule.trigger.toLowerCase();
    let matched = false;

    switch (rule.matchMode) {
      case 'exact':
        matched = text === trigger;
        break;
      case 'starts_with':
        matched = text.startsWith(trigger);
        break;
      case 'contains':
      default:
        matched = text.includes(trigger);
        break;
    }

    if (matched) {
      console.log(`🤖 [automation:${userId}] Rule "${rule.name}" matched for "${incomingMessage.body}"`);
      return {
        ruleId: rule._id,
        replyMessage: rule.replyMessage,
        replyMediaUrl: rule.replyMediaUrl,
      };
    }
  }

  return null;
}

// ============================================================
// CREATE WEBHOOK
// ============================================================
async function createWebhook(userId, data) {
  const webhook = await Webhook.create({
    userId,
    name: data.name || 'My Webhook',
    url: data.url,
    events: data.events || ['message_received'],
    headers: data.headers || {},
    active: true,
  });
  return webhook;
}

// ============================================================
// GET WEBHOOKS FOR USER
// ============================================================
async function getWebhooks(userId) {
  return Webhook.find({ userId }).sort({ createdAt: -1 }).lean();
}

// ============================================================
// DELETE WEBHOOK
// ============================================================
async function deleteWebhook(userId, webhookId) {
  const webhook = await Webhook.findOneAndDelete({ _id: webhookId, userId });
  if (!webhook) throw new Error('Webhook not found');
  return { success: true };
}

// ============================================================
// CREATE AUTOMATION RULE
// ============================================================
async function createRule(userId, data) {
  const rule = await AutomationRule.create({
    userId,
    name: data.name,
    trigger: data.trigger,
    matchMode: data.matchMode || 'contains',
    replyMessage: data.replyMessage,
    replyMediaUrl: data.replyMediaUrl || null,
    priority: data.priority || 0,
    active: true,
  });
  return rule;
}

// ============================================================
// GET AUTOMATION RULES
// ============================================================
async function getRules(userId) {
  return AutomationRule.find({ userId }).sort({ priority: -1, createdAt: 1 }).lean();
}

// ============================================================
// DELETE RULE
// ============================================================
async function deleteRule(userId, ruleId) {
  const rule = await AutomationRule.findOneAndDelete({ _id: ruleId, userId });
  if (!rule) throw new Error('Rule not found');
  return { success: true };
}

module.exports = {
  triggerWebhooks,
  deliverWebhook,
  checkAutomationRules,
  createWebhook,
  getWebhooks,
  deleteWebhook,
  createRule,
  getRules,
  deleteRule,
};
