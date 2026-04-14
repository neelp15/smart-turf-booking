const express = require('express');
const router = express.Router();
const { sendBroadcastNotification } = require('../controllers/broadcastController');

// Route to send broadcast emails to all players
router.post('/notify', sendBroadcastNotification);

module.exports = router;
