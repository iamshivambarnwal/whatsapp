'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const webhookController = require('../controllers/webhookController');

router.use(auth);

router.post('/rule', webhookController.createRule);
router.get('/rules', webhookController.listRules);
router.delete('/rule/:id', webhookController.deleteRule);

module.exports = router;
