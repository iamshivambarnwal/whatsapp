'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');

router.use(auth);

router.post('/upload', campaignController.uploadContacts);
router.get('/', campaignController.getContacts);

module.exports = router;
