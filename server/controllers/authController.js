const admin = require('firebase-admin');
const { saveOTP, verifyOTPFromStore } = require('../utils/otpStore');
const mailSender = require('../utils/mailSender');

/**
 * Controller to generate and send an OTP to an email address.
 */
const sendOTP = async (req, res) => {
  console.log("sendOTP request body:", req.body);
  try {
    let { email, type } = req.body; // type is 'signup' or 'login'

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    email = email.trim().toLowerCase();
    type = type ? type.trim() : "";

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Firestore
    await saveOTP(email, otp, type);

    // Prepare Email Content
    const title = type === 'signup' ? "Email Verification - Turf Connect" : "Login OTP - Turf Connect";
    const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #15803d;">Turf Connect Verification</h2>
        <p>Dear User,</p>
        <p>Your OTP for ${type === 'signup' ? 'completing your registration' : 'logging in'} is:</p>
        <h1 style="color: #15803d; font-size: 32px; letter-spacing: 5px; text-align: center; background: #f0fdf4; padding: 10px; border-radius: 5px;">${otp}</h1>
        <p>This OTP is valid for 5 minutes. Please do not share this code with anyone.</p>
        <p>Best regards,<br/>The Turf Connect Team</p>
      </div>
    `;

    // Send Email
    await mailSender(email, title, body);

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Error sending OTP. Please try again." });
  }
};

/**
 * Controller to verify the OTP.
 */
const verifyOTP = async (req, res) => {
  console.log("verifyOTP request body:", req.body);
  try {
    let { email, otp, type } = req.body;

    if (!email || !otp || !type) {
      return res.status(400).json({ success: false, message: "Email, OTP, and Type are required" });
    }

    email = email.trim().toLowerCase();
    otp = otp.trim();
    type = type.trim();

    const isValid = await verifyOTPFromStore(email, otp, type);

    if (isValid) {
      res.status(200).json({ success: true, message: "OTP verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Error verifying OTP. Please try again." });
  }
};

/**
 * Controller to request a password reset email.
 */
const requestPasswordReset = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    email = email.trim().toLowerCase();

    // Generate accurate Firebase Password Reset Link
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // Prepare Email Content
    const title = "Reset Your Password - Turf Connect";
    const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #15803d;">Password Reset Request</h2>
        <p>Hi there,</p>
        <p>We received a request to reset your password for your Turf Connect account. If you didn't make this request, you can safely ignore this email.</p>
        <p>To reset your password, click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #15803d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
        <p>Best regards,<br/>The Turf Connect Team</p>
      </div>
    `;

    // Send Email via NodeMailer (Proven to work for user)
    await mailSender(email, title, body);

    res.status(200).json({ success: true, message: "Password reset email sent successfully via our secure server" });
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    // Specifically handle "user not found" if needed, though Firebase usually returns 200 for security
    res.status(500).json({ success: false, message: "Failed to send reset email. Please ensure the email is registered." });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  requestPasswordReset
};
