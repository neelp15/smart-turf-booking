const admin = require('firebase-admin');
const mailSender = require('../utils/mailSender');

/**
 * Sends a broadcast email to ALL registered players.
 */
const sendBroadcastNotification = async (req, res) => {
  try {
    const { ownerName, title, message } = req.body;

    if (!ownerName || !title || !message) {
      return res.status(400).json({ success: false, message: "Missing required broadcast details" });
    }

    const db = admin.firestore();

    // 1. Fetch ALL Players
    console.log("Fetching all players for broadcast...");
    const playersSnap = await db.collection('players').get();
    
    if (playersSnap.empty) {
      return res.status(200).json({ success: true, message: "No players found to notify" });
    }

    const players = playersSnap.docs.map(doc => doc.data()).filter(p => p.email);
    const playerEmails = players.map(p => p.email);

    // 2. Prepare Email Body
    const emailTitle = `${title} - Announcement by ${ownerName}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #15803d; margin: 0;">Turf Connect</h1>
          <p style="color: #666; font-size: 14px;">Special Announcement</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; border-left: 5px solid #16a34a;">
          <h2 style="color: #14532d; margin-top: 0;">${title}</h2>
          <p style="white-space: pre-wrap; color: #374151; font-size: 16px;">${message}</p>
        </div>
        
        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #999;">
          <p>This message was sent to you by <strong>${ownerName}</strong> via Turf Connect.</p>
          <p>Want to see more deals? <a href="http://localhost:5173" style="color: #15803d; text-decoration: none; font-weight: bold;">Browse Turfs Now</a></p>
        </div>
      </div>
    `;

    // 3. Send Emails
    // For large lists, you would typically use BCC or a mailing service queue.
    // For this implementation, we'll send them in parallel.
    console.log(`Sending broadcast to ${playerEmails.length} players...`);
    
    const sendPromises = playerEmails.map(email => 
      mailSender(email, emailTitle, emailBody).catch(err => {
        console.error(`Failed to send broadcast email to ${email}:`, err);
        return null;
      })
    );

    await Promise.all(sendPromises);

    res.status(200).json({ success: true, message: `Broadcast sent to ${playerEmails.length} players successfully` });
  } catch (error) {
    console.error("Error in broadcast notification:", error);
    res.status(500).json({ success: false, message: "Error sending broadcast. Please check server logs." });
  }
};

module.exports = {
  sendBroadcastNotification
};
