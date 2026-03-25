const admin = require('firebase-admin');
const mailSender = require('../utils/mailSender');

/**
 * Sends a booking notification email to both the player and the turf owner.
 */
const sendBookingNotification = async (req, res) => {
  try {
    const { bookingId, turfId, userUid, ownerUid, date, slots, totalPrice, turfName } = req.body;

    if (!bookingId || !turfId || !userUid || !ownerUid) {
      return res.status(400).json({ success: false, message: "Missing required booking details" });
    }

    const db = admin.firestore();

    // 1. Fetch User (Player) Email
    const userSnap = await db.collection('players').doc(userUid).get();
    const userEmail = userSnap.exists ? userSnap.data().email : null;
    const userName = userSnap.exists ? userSnap.data().name : 'Player';

    // 2. Fetch Owner Email
    const ownerSnap = await db.collection('owners').doc(ownerUid).get();
    const ownerEmail = ownerSnap.exists ? ownerSnap.data().email : null;
    const ownerName = ownerSnap.exists ? ownerSnap.data().name : 'Owner';

    if (!userEmail || !ownerEmail) {
      console.error("Failed to find emails for notification:", { userEmail, ownerEmail });
      return res.status(404).json({ success: false, message: "User or Owner email not found" });
    }

    const slotList = slots.map(s => s.time || s).join(', ');

    // 3. Prepare Email for Player
    const playerTitle = "Booking Confirmed - Turf Connect";
    const playerBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #15803d;">Booking Confirmed!</h2>
        <p>Hi ${userName},</p>
        <p>Your booking at <strong>${turfName}</strong> has been successfully confirmed.</p>
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 5px 0;"><strong>Time Slots:</strong> ${slotList}</p>
          <p style="margin: 5px 0;"><strong>Total Price:</strong> ₹${totalPrice}</p>
        </div>
        <p>See you at the turf!</p>
        <p>Best regards,<br/>The Turf Connect Team</p>
      </div>
    `;

    // 4. Prepare Email for Owner
    const ownerTitle = "New Booking Received - Turf Connect";
    const ownerBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #15803d;">New Booking Alert</h2>
        <p>Hi ${ownerName},</p>
        <p>You have received a new booking for <strong>${turfName}</strong>.</p>
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
          <p style="margin: 5px 0;"><strong>Customer:</strong> ${userName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 5px 0;"><strong>Time Slots:</strong> ${slotList}</p>
          <p style="margin: 5px 0;"><strong>Total Price:</strong> ₹${totalPrice}</p>
        </div>
        <p>Please ensure the turf is ready for the scheduled time.</p>
        <p>Best regards,<br/>The Turf Connect Team</p>
      </div>
    `;

    // 5. Send Emails
    console.log(`Sending notifications for booking ${bookingId}...`);
    await Promise.all([
      mailSender(userEmail, playerTitle, playerBody),
      mailSender(ownerEmail, ownerTitle, ownerBody)
    ]);

    res.status(200).json({ success: true, message: "Booking notifications sent successfully" });
  } catch (error) {
    console.error("Error sending booking notification:", error);
    res.status(500).json({ success: false, message: "Error sending notification. Please check logs." });
  }
};

module.exports = {
  sendBookingNotification
};
