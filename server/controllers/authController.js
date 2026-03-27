const admin = require('firebase-admin');
const { saveOTP, verifyOTPFromStore } = require('../utils/otpStore');
const mailSender = require('../utils/mailSender');

/**
 * Controller to generate and send an OTP to an email address.
 */
const sendOTP = async (req, res) => {
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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: left;">
          <h2 style="color: #15803d; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 24px; text-align: center; letter-spacing: -0.5px;">Turf Connect</h2>
          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin-bottom: 24px;" />
          <h3 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Security Verification Code</h3>
          <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
            Your verification code for ${type === 'signup' ? 'completing your registration' : 'securely logging in'} is:
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-size: 36px; font-weight: 800; letter-spacing: 8px; padding: 16px 32px; border-radius: 12px;">
              ${otp}
            </div>
          </div>
          <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
            This security code is valid for 1 minute. <strong>Please do not share this code with anyone.</strong>
          </p>
          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin-bottom: 24px;" />
          <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
            If you did not request this code, your account is still secure. You can safely ignore this email.
          </p>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} Turf Connect. All rights reserved.
        </p>
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
    const defaultResetLink = await admin.auth().generatePasswordResetLink(email);

    // Extract oobCode and construct our beautiful React frontend link
    const url = new URL(defaultResetLink);
    const oobCode = url.searchParams.get("oobCode");
    const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";
    const customLink = `${clientUrl}/reset-password?oobCode=${oobCode}`;

    // Prepare Email Content
    const title = "Reset Your Password - Turf Connect";
    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: left;">
          <h2 style="color: #15803d; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 24px; text-align: center; letter-spacing: -0.5px;">Turf Connect</h2>
          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin-bottom: 24px;" />
          <h3 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Reset your password</h3>
          <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
            We received a request to reset the password for your Turf Connect account. Click the button below to securely choose a new password.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${customLink}" style="display: inline-block; background-color: #15803d; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(21, 128, 61, 0.2);">Reset Password</a>
          </div>
          <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
            If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
          </p>
          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin-bottom: 24px;" />
          <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
            If the button above doesn't work, copy and paste this link into your browser:<br/>
            <a href="${customLink}" style="color: #15803d; word-break: break-all;">${customLink}</a>
          </p>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} Turf Connect. All rights reserved.
        </p>
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
