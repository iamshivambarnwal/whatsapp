const express = require('express');
const router = express.Router();

const logService = require('../services/logService');

// Get all logs
router.get('/', async (req, res) => {
  try {
    const type = req.query.type;
    const logs = type ? await logService.getLogsByType(type) : await logService.getAllLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent logs
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await logService.getRecentLogs(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear all logs
router.delete('/clear', async (req, res) => {
  try {
    await logService.clearLogs();
    res.json({ success: true, message: 'All logs cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
