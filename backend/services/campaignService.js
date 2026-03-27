'use strict';

const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const queueService = require('./queueService');
const messageService = require('./messageService');
const usageService = require('./usageService');

// ============================================================
// CREATE CAMPAIGN
// ============================================================
async function createCampaign(userId, data) {
  const { name, message, mediaUrl, contactIds, batchSize, batchDelaySeconds } = data;

  const total = contactIds ? contactIds.length : 0;

  const campaign = await Campaign.create({
    userId,
    name,
    message,
    mediaUrl: mediaUrl || null,
    status: 'draft',
    total,
    sent: 0,
    failed: 0,
    batchSize: Math.min(batchSize || 20, 50),
    batchDelaySeconds: Math.min(Math.max(batchDelaySeconds || 60, 30), 120),
  });

  return campaign;
}

// ============================================================
// START CAMPAIGN — kicks off batch processing
// ============================================================
async function startCampaign(userId, campaignId) {
  const campaign = await Campaign.findOne({ _id: campaignId, userId });
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status !== 'draft' && campaign.status !== 'paused') {
    throw new Error(`Cannot start campaign with status: ${campaign.status}`);
  }

  // Check plan limits
  const planCheck = await usageService.checkCampaignAllowed(userId);
  if (!planCheck.allowed) {
    throw new Error(planCheck.error);
  }

  campaign.status = 'running';
  campaign.lastBatchAt = new Date();
  await campaign.save();

  // Trigger first batch immediately
  processNextBatch(campaignId, userId);

  return campaign;
}

// ============================================================
// PAUSE CAMPAIGN
// ============================================================
async function pauseCampaign(userId, campaignId) {
  const campaign = await Campaign.findOne({ _id: campaignId, userId });
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status !== 'running') {
    throw new Error('Only running campaigns can be paused');
  }

  campaign.status = 'paused';
  await campaign.save();
  return campaign;
}

// ============================================================
// CANCEL CAMPAIGN
// ============================================================
async function cancelCampaign(userId, campaignId) {
  const campaign = await Campaign.findOne({ _id: campaignId, userId });
  if (!campaign) throw new Error('Campaign not found');

  campaign.status = 'cancelled';
  await campaign.save();
  return campaign;
}

// ============================================================
// GET CAMPAIGN STATUS
// ============================================================
async function getCampaignStatus(userId, campaignId) {
  const campaign = await Campaign.findOne({ _id: campaignId, userId });
  if (!campaign) throw new Error('Campaign not found');
  return campaign;
}

// ============================================================
// GET ALL CAMPAIGNS FOR USER
// ============================================================
async function getUserCampaigns(userId) {
  return Campaign.find({ userId }).sort({ createdAt: -1 }).lean();
}

// ============================================================
// PROCESS NEXT BATCH — recursive batch scheduler
// ============================================================
async function processNextBatch(campaignId, userId) {
  // Check if campaign still running
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== 'running') return;

  const { batchSize, batchDelaySeconds, total, processedContacts } = campaign;
  const remaining = total - processedContacts;

  if (remaining <= 0) {
    campaign.status = 'completed';
    await campaign.save();
    console.log(`🏁 [campaign:${campaignId}] Campaign completed — ${campaign.sent} sent, ${campaign.failed} failed`);
    return;
  }

  // Fetch next batch of contacts
  const contacts = await Contact.find({ userId })
    .sort({ _id: 1 })
    .skip(processedContacts)
    .limit(batchSize)
    .lean();

  if (contacts.length === 0) {
    campaign.status = 'completed';
    await campaign.save();
    return;
  }

  // Enqueue each contact as a campaign job
  for (const contact of contacts) {
    await enqueueCampaignJob(campaignId, userId, contact, campaign.message, campaign.mediaUrl);
  }

  // Update progress
  campaign.processedContacts += contacts.length;
  campaign.lastBatchAt = new Date();
  await campaign.save();

  console.log(`📦 [campaign:${campaignId}] Batch ${contacts.length} queued. Progress: ${campaign.processedContacts}/${total}`);

  // Schedule next batch after delay
  setTimeout(() => processNextBatch(campaignId, userId), batchDelaySeconds * 1000);
}

// ============================================================
// ENQUEUE A SINGLE CAMPAIGN MESSAGE JOB
// ============================================================
async function enqueueCampaignJob(campaignId, userId, contact, message, mediaUrl) {
  const job = await queueService.addCampaignJob(campaignId, userId, {
    to: contact.phone,
    body: message,
    mediaUrl,
    contactId: contact._id.toString(),
    contactName: contact.name,
    campaignId: campaignId.toString(),
  });
  return job;
}

// ============================================================
// UPDATE CAMPAIGN STATS (called by worker)
// ============================================================
async function incrementCampaignSent(campaignId) {
  await Campaign.findByIdAndUpdate(campaignId, { $inc: { sent: 1 } });
}

async function incrementCampaignFailed(campaignId) {
  await Campaign.findByIdAndUpdate(campaignId, { $inc: { failed: 1 } });
}

// ============================================================
// UPLOAD CONTACTS (bulk)
// ============================================================
async function uploadContacts(userId, contacts) {
  const results = { added: 0, skipped: 0, errors: [] };

  for (const item of contacts) {
    if (!item.phone) { results.errors.push({ item, error: 'Phone required' }); continue; }

    const cleaned = item.phone.replace(/\D/g, '');
    if (cleaned.length < 8) { results.skipped++; continue; }

    try {
      await Contact.findOneAndUpdate(
        { userId, phone: item.phone },
        {
          userId,
          name: item.name || 'Unknown',
          phone: item.phone,
          email: item.email || null,
          tags: item.tags || [],
        },
        { upsert: true, new: true }
      );
      results.added++;
    } catch (err) {
      if (err.code === 11000) { results.skipped++; }
      else { results.errors.push({ phone: item.phone, error: err.message }); }
    }
  }

  return results;
}

// ============================================================
// GET CONTACTS FOR USER
// ============================================================
async function getContacts(userId, { limit = 100, search = null, tags = null } = {}) {
  const query = { userId };
  if (search) query.name = { $regex: search, $options: 'i' };
  if (tags) query.tags = { $in: tags };

  return Contact.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  createCampaign,
  startCampaign,
  pauseCampaign,
  cancelCampaign,
  getCampaignStatus,
  getUserCampaigns,
  processNextBatch,
  enqueueCampaignJob,
  incrementCampaignSent,
  incrementCampaignFailed,
  uploadContacts,
  getContacts,
};
