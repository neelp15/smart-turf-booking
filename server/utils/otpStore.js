const admin = require('firebase-admin');

/**
 * Stores an OTP in Firestore for a given email.
 * @param {string} email - User's email address
 * @param {string} otp - The 6-digit OTP
 * @param {string} type - 'signup' or 'login'
 * @returns {Promise<void>}
 */
const saveOTP = async (email, otp, type) => {
  const db = admin.firestore();
  const expiresAt = Date.now() + 1 * 60 * 1000; // 1 minute from now

  await db.collection('verification_otps').doc(email).set({
    otp,
    expiresAt,
    type,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
};

/**
 * Verifies if the provided OTP is valid and not expired.
 * @param {string} email - User's email address
 * @param {string} otp - The OTP to verify
 * @param {string} type - 'signup' or 'login'
 * @returns {Promise<boolean>}
 */
const verifyOTPFromStore = async (email, otp, type) => {
  const db = admin.firestore();
  const doc = await db.collection('verification_otps').doc(email).get();
  if (!doc.exists) {
    return false;
  }

  const data = doc.data();
  
  // Check if type matches
  if (data.type !== type) {
    return false;
  }

  // Check if expired
  const now = Date.now();
  if (now > data.expiresAt) {
    await db.collection('verification_otps').doc(email).delete();
    return false;
  }

  // Check if OTP matches
  if (data.otp === otp) {
    // Delete OTP after successful verification to prevent reuse
    await db.collection('verification_otps').doc(email).delete();
    return true;
  }

  return false;
};

module.exports = {
  saveOTP,
  verifyOTPFromStore
};
