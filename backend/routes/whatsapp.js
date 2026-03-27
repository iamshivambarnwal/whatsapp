'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const whatsappController = require('../controllers/whatsappController');

// All routes require authentication
router.use(auth);

router.post('/connect', whatsappController.connect);
router.get('/status', whatsappController.status);
router.delete('/disconnect', whatsappController.disconnect);
router.get('/active', whatsappController.getActiveClients);

module.exports = router;
