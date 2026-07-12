const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send an email
 * @param {object} options - { to, subject, html, text? }
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (!process.env.MAIL_USER || process.env.NODE_ENV === 'test') return;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'EcoSphere <no-reply@ecosphere.com>',
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('📧 Mail send error:', err.message);
  }
};

module.exports = { sendMail, transporter };
