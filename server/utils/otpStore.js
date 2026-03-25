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
  console.log(`Verifying OTP for ${email}, Provided: ${otp}, Type: ${type}`);
  const doc = await db.collection('verification_otps').doc(email).get();
  if (!doc.exists) {
    console.log(`No OTP found in store for ${email}`);
    return false;
  }

  const data = doc.data();
  console.log(`Stored OTP data:`, { otp: data.otp, type: data.type, expiresAt: data.expiresAt });
  
  // Check if type matches
  if (data.type !== type) {
    console.log(`Type mismatch: Stored ${data.type}, Provided ${type}`);
    return false;
  }

  // Check if expired
  const now = Date.now();
  if (now > data.expiresAt) {
    console.log(`OTP EXPIRED: Stored expiry ${data.expiresAt}, Current time ${now}`);
    await db.collection('verification_otps').doc(email).delete();
    return false;
  }

  // Check if OTP matches
  if (data.otp === otp) {
    console.log(`OTP MATCH SUCCESS for ${email}`);
    // Delete OTP after successful verification to prevent reuse
    await db.collection('verification_otps').doc(email).delete();
    return true;
  }

  console.log(`OTP MISMATCH: Stored ${data.otp}, Provided ${otp}`);
  return false;
};

module.exports = {
  saveOTP,
  verifyOTPFromStore
};
