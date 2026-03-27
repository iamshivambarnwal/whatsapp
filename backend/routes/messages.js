'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

// All routes require authentication
router.use(auth);

router.post('/send', messageController.send);
router.get('/logs', messageController.logs);
router.get('/stats', messageController.stats);
router.get('/queue', messageController.queue);

module.exports = router;
