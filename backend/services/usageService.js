'use strict';

/**
 * Usage tracking and plan enforcement
 * Strict per-user limits enforced before any message is queued
 */

const User = require('../models/User');
const MessageLog = require('../models/MessageLog');

// ============================================================
// PLAN LIMITS
// ============================================================
const PLAN_LIMITS = {
  free: {
    messagesPerDay: 50,
    messagesPerMonth: 0,
    campaignsEnabled: false,
    webhooksEnabled: false,
    automationEnabled: false,
    priority: 3, // lowest
  },
  starter: {
    messagesPerDay: 0,
    messagesPerMonth: 2000,
    campaignsEnabled: true,
    webhooksEnabled: false,
    automationEnabled: false,
    priority: 2,
  },
  pro: {
    messagesPerDay: 0,
    messagesPerMonth: 10000,
    campaignsEnabled: true,
    webhooksEnabled: true,
    automationEnabled: true,
    priority: 1,
  },
  enterprise: {
    messagesPerDay: 0,
    messagesPerMonth: 50000,
    campaignsEnabled: true,
    webhooksEnabled: true,
    automationEnabled: true,
    priority: 0, // highest
  },
};

// ============================================================
// GET USER PLAN WITH USAGE
// ============================================================
async function getUserPlanInfo(userId) {
  const user = await User.findById(userId).lean();
  const plan = user?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Get usage for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [dailyCount, monthlyCount, totalCount] = await Promise.all([
    MessageLog.countDocuments({ userId, createdAt: { $gte: todayStart } }),
    MessageLog.countDocuments({ userId, createdAt: { $gte: monthStart } }),
    MessageLog.countDocuments({ userId }),
  ]);

  return {
    plan,
    limits,
    usage: {
      daily: dailyCount,
      monthly: monthlyCount,
      total: totalCount,
      dailyLimit: limits.messagesPerDay || null,
      monthlyLimit: limits.messagesPerMonth || null,
    },
    features: {
      campaigns: limits.campaignsEnabled,
      webhooks: limits.webhooksEnabled,
      automation: limits.automationEnabled,
    },
  };
}

// ============================================================
// CHECK IF USER CAN SEND MESSAGE
// ============================================================
async function canSendMessage(userId) {
  const planInfo = await getUserPlanInfo(userId);
  const { plan, limits, usage } = planInfo;

  // Daily limit check
  if (limits.messagesPerDay > 0 && usage.daily >= limits.messagesPerDay) {
    return {
      allowed: false,
      error: `Daily message limit reached (${usage.daily}/${limits.messagesPerDay}). Resets at midnight.`,
      code: 'DAILY_LIMIT_EXCEEDED',
    };
  }

  // Monthly limit check
  if (limits.messagesPerMonth > 0 && usage.monthly >= limits.messagesPerMonth) {
    return {
      allowed: false,
      error: `Monthly message limit reached (${usage.monthly}/${limits.messagesPerMonth}). Upgrade your plan.`,
      code: 'MONTHLY_LIMIT_EXCEEDED',
    };
  }

  return { allowed: true, plan, priority: limits.priority };
}

// ============================================================
// CHECK IF USER CAN CREATE CAMPAIGN
// ============================================================
async function checkCampaignAllowed(userId) {
  const planInfo = await getUserPlanInfo(userId);
  if (!planInfo.features.campaigns) {
    return {
      allowed: false,
      error: 'Campaigns require the Starter plan or higher. Upgrade to access bulk messaging.',
      code: 'CAMPAIGNS_NOT_ALLOWED',
    };
  }
  return { allowed: true };
}

// ============================================================
// CHECK IF USER CAN USE WEBHOOKS
// ============================================================
async function checkWebhookAllowed(userId) {
  const planInfo = await getUserPlanInfo(userId);
  if (!planInfo.features.webhooks) {
    return {
      allowed: false,
      error: 'Webhooks require the Pro plan or higher.',
      code: 'WEBHOOKS_NOT_ALLOWED',
    };
  }
  return { allowed: true };
}

// ============================================================
// CHECK IF USER CAN USE AUTOMATION
// ============================================================
async function checkAutomationAllowed(userId) {
  const planInfo = await getUserPlanInfo(userId);
  if (!planInfo.features.automation) {
    return {
      allowed: false,
      error: 'Automation requires the Pro plan or higher.',
      code: 'AUTOMATION_NOT_ALLOWED',
    };
  }
  return { allowed: true };
}

// ============================================================
// GET PRIORITY FOR QUEUE
// Higher priority = lower number in BullMQ
// ============================================================
async function getQueuePriority(userId) {
  const planInfo = await getUserPlanInfo(userId);
  return planInfo.limits.priority;
}

// ============================================================
// UPDATE USER PLAN (admin)
// ============================================================
async function updateUserPlan(userId, plan) {
  if (!PLAN_LIMITS[plan]) throw new Error('Invalid plan');
  await User.findByIdAndUpdate(userId, { plan });
  return { success: true, plan };
}

module.exports = {
  PLAN_LIMITS,
  getUserPlanInfo,
  canSendMessage,
  checkCampaignAllowed,
  checkWebhookAllowed,
  checkAutomationAllowed,
  getQueuePriority,
  updateUserPlan,
};
