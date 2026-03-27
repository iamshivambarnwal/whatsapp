'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');

router.use(auth);

router.post('/create', campaignController.create);
router.post('/start/:id', campaignController.start);
router.post('/pause/:id', campaignController.pause);
router.post('/cancel/:id', campaignController.cancel);
router.get('/status/:id', campaignController.status);
router.get('/list', campaignController.list);

module.exports = router;
