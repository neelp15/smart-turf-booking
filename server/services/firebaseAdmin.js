const admin = require('firebase-admin');

// Service for interacting with Firestore using Admin SDK
const db = admin.firestore();

module.exports = {
  admin,
  db,
  // placeholder for addTurf, getTurfs, etc.
};
