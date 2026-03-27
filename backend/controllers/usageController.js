'use strict';

const usageService = require('../services/usageService');

exports.getUsage = async (req, res) => {
  try {
    const planInfo = await usageService.getUserPlanInfo(req.userId);
    res.json({ success: true, ...planInfo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLimits = (req, res) => {
  res.json({ success: true, plans: usageService.PLAN_LIMITS });
};
