const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, requestPasswordReset } = require('../controllers/authController');

// Route to send OTP
router.post('/send-otp', sendOTP);

// Route to verify OTP
router.post('/verify-otp', verifyOTP);

// Route to request password reset
router.post('/password-reset', requestPasswordReset);

module.exports = router;
