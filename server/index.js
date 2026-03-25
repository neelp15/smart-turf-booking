const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const mailSender = require('./utils/mailSender');
require('dotenv').config();

const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const uploadRoutes = require('./routes/uploadRoutes');
const turfRoutes = require('./routes/turfRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true })); 

// Routes
app.use('/api', uploadRoutes);
app.use('/api/turfs', turfRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// TEST ROUTE - NOW SENDS REAL EMAIL
app.post('/api/auth/test-reset', async (req, res) => {
  try {
    const { email } = req.body;
    console.log("TEST RESET REQUEST FOR:", email);
    
    // 1. Generate Link
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    console.log("Generated Link:", resetLink);

    // 2. Prepare Email
    const title = "TEST Reset Link - Turf Connect";
    const body = `<h1>Password Reset Test</h1><p>Link: <a href="${resetLink}">${resetLink}</a></p>`;

    // 3. Send Email
    console.log("Attempting to send email via NodeMailer...");
    await mailSender(email, title, body);
    console.log("Email sent successfully according to NodeMailer");

    res.json({ success: true, message: "Server reached AND email sent! Check inbox/spam." });
  } catch (error) {
    console.error("TEST RESET ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// REAL ROUTE (Trying it again here)
app.post('/api/auth/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    const title = "Reset Your Password - Turf Connect";
    const body = `<p>Click here: <a href="${resetLink}">${resetLink}</a></p>`;
    await mailSender(email, title, body);
    res.json({ success: true, message: "Password reset email sent!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Turf Connect API is running...');
});

// Database Connection (Placeholder)
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('MongoDB Connected'))
//   .catch(err => console.log(err));

// 404 Handler for debugging
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
