const logService = require('../services/logService');

// Get all logs
exports.getLogs = async (req, res) => {
  try {
    const type = req.query.type;
    const logs = type ? logService.getLogsByType(type) : logService.getAllLogs();
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get recent logs
exports.getRecentLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = logService.getRecentLogs(limit);
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Clear all logs
exports.clearLogs = async (req, res) => {
  try {
    logService.clearLogs();
    
    res.json({
      success: true,
      message: 'All logs cleared'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
