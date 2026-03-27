'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const webhookController = require('../controllers/webhookController');

router.use(auth);

router.post('/create', webhookController.createWebhook);
router.get('/', webhookController.listWebhooks);
router.delete('/:id', webhookController.deleteWebhook);

module.exports = router;
