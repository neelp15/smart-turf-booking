const express = require('express');
const router = express.Router();
const { sendBookingNotification } = require('../controllers/bookingController');

// Route to send booking notification emails
router.post('/notify', sendBookingNotification);

module.exports = router;
