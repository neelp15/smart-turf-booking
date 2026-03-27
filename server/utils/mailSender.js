const nodemailer = require('nodemailer');

/**
 * Sends an email using NodeMailer.
 * @param {string} email - Recipient's email
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML)
 * @returns {Promise<any>}
 */
const mailSender = async (email, title, body) => {
  try {
    // Create a Transporter to send emails
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      pool: true, // use connection pooling for speed
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Send emails to users
    let info = await transporter.sendMail({
      from: `"Turf Connect" <${process.env.MAIL_USER}>`,
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
    });

    return info;
  } catch (error) {
    console.log("Error sending email: ", error.message);
    throw new Error("Could not send verification email.");
  }
};

module.exports = mailSender;
