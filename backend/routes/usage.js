'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const usageController = require('../controllers/usageController');

router.get('/me', auth, usageController.getUsage);
router.get('/limits', usageController.getLimits);

module.exports = router;
