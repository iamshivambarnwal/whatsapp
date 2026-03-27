'use strict';

const campaignService = require('../services/campaignService');
const usageService = require('../services/usageService');

exports.create = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, message, mediaUrl, contactIds, batchSize, batchDelaySeconds } = req.body;

    if (!name || !message) {
      return res.status(400).json({ success: false, error: 'Name and message required' });
    }

    const campaign = await campaignService.createCampaign(userId, {
      name, message, mediaUrl, contactIds, batchSize, batchDelaySeconds,
    });

    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.start = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const campaign = await campaignService.startCampaign(userId, id);
    res.json({ success: true, campaign, message: 'Campaign started' });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message.includes('not allowed') || err.message.includes('limit')) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.pause = async (req, res) => {
  try {
    const campaign = await campaignService.pauseCampaign(req.userId, req.params.id);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const campaign = await campaignService.cancelCampaign(req.userId, req.params.id);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.status = async (req, res) => {
  try {
    const campaign = await campaignService.getCampaignStatus(req.userId, req.params.id);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const campaigns = await campaignService.getUserCampaigns(req.userId);
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.uploadContacts = async (req, res) => {
  try {
    const userId = req.userId;
    const { contacts } = req.body;

    if (!Array.isArray(contacts)) {
      return res.status(400).json({ success: false, error: 'contacts must be an array' });
    }

    // Check plan
    const planCheck = await usageService.checkCampaignAllowed(userId);
    if (!planCheck.allowed) {
      return res.status(403).json({ success: false, error: planCheck.error });
    }

    const results = await campaignService.uploadContacts(userId, contacts);
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const search = req.query.search || null;
    const contacts = await campaignService.getContacts(req.userId, { limit, search });
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
