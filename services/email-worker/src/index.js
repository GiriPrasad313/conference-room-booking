/**
 * Email Worker - Conference Room Booking System
 * 
 * This worker processes email notifications from an SQS queue.
 * It can run as a standalone service or be deployed as an AWS Lambda function.
 * 
 * In local development, it simulates message processing.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const { processEmailQueue } = require('./queue/processor');

const MODE = process.env.WORKER_MODE || 'local'; // 'local', 'sqs', or 'lambda'

// Create email transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use AWS SES in production
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Use console logging in development
  return {
    sendMail: async (mailOptions) => {
      console.log('\n📧 EMAIL NOTIFICATION (Development Mode)');
      console.log('=========================================');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Body:\n${mailOptions.text || mailOptions.html}`);
      console.log('=========================================\n');
      return { messageId: `dev-${Date.now()}` };
    }
  };
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  bookingConfirmation: (data) => ({
    subject: `Booking Confirmed - ${data.roomName}`,
    text: `
Hello,

Your booking has been confirmed!

Booking Details:
- Room: ${data.roomName}
- Location: ${data.locationName}
- Date: ${data.bookingDate}
- Price: £${data.finalPrice.toFixed(2)}

${data.weatherCondition ? `Weather forecast for your booking date: ${data.forecastedTemp}°C, ${data.weatherCondition}` : ''}

Thank you for using our Conference Room Booking System!

Best regards,
The Booking Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;}</style></head>
<body>
  <h2>Booking Confirmed! ✅</h2>
  <p>Hello,</p>
  <p>Your booking has been confirmed!</p>
  
  <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0;">
    <h3 style="margin-top:0;">Booking Details</h3>
    <ul style="list-style:none;padding:0;">
      <li><strong>Room:</strong> ${data.roomName}</li>
      <li><strong>Location:</strong> ${data.locationName}</li>
      <li><strong>Date:</strong> ${data.bookingDate}</li>
      <li><strong>Price:</strong> £${data.finalPrice.toFixed(2)}</li>
    </ul>
    ${data.weatherCondition ? `
    <p style="color:#666;font-size:0.9em;">
      🌤️ Weather forecast: ${data.forecastedTemp}°C, ${data.weatherCondition}
    </p>
    ` : ''}
  </div>
  
  <p>Thank you for using our Conference Room Booking System!</p>
  <p>Best regards,<br>The Booking Team</p>
</body>
</html>
    `.trim()
  }),

  bookingCancellation: (data) => ({
    subject: `Booking Cancelled - ${data.roomName}`,
    text: `
Hello,

Your booking has been cancelled.

Cancelled Booking Details:
- Room: ${data.roomName}
- Location: ${data.locationName}
- Date: ${data.bookingDate}

If you didn't request this cancellation, please contact support.

Best regards,
The Booking Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;}</style></head>
<body>
  <h2>Booking Cancelled ❌</h2>
  <p>Hello,</p>
  <p>Your booking has been cancelled.</p>
  
  <div style="background:#fff3cd;padding:15px;border-radius:5px;margin:20px 0;">
    <h3 style="margin-top:0;">Cancelled Booking Details</h3>
    <ul style="list-style:none;padding:0;">
      <li><strong>Room:</strong> ${data.roomName}</li>
      <li><strong>Location:</strong> ${data.locationName}</li>
      <li><strong>Date:</strong> ${data.bookingDate}</li>
    </ul>
  </div>
  
  <p>If you didn't request this cancellation, please contact support.</p>
  <p>Best regards,<br>The Booking Team</p>
</body>
</html>
    `.trim()
  })
};

// Send email function
const sendEmail = async (to, type, data) => {
  const template = emailTemplates[type];
  if (!template) {
    throw new Error(`Unknown email template: ${type}`);
  }

  const { subject, text, html } = template(data);
  
  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Conference Room Booking" <noreply@booking.example.com>',
      to,
      subject,
      text,
      html
    });
    
    console.log(`Email sent successfully: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    throw error;
  }
};

// Message handler
const handleMessage = async (message) => {
  const { type, recipient, data } = message;
  
  console.log(`Processing ${type} email for ${recipient}`);
  
  try {
    await sendEmail(recipient, type, data);
    return { success: true };
  } catch (error) {
    console.error(`Failed to process message:`, error.message);
    return { success: false, error: error.message };
  }
};

// Start worker based on mode
const startWorker = async () => {
  console.log(`Email Worker starting in ${MODE} mode...`);
  
  if (MODE === 'local') {
    // Local development - process from in-memory queue or manual triggers
    console.log('Email Worker ready (local mode - no queue)');
    console.log('Call handleMessage() directly to test email sending');
    
    // Keep process alive
    setInterval(() => {
      // Heartbeat
    }, 60000);
  } else if (MODE === 'sqs') {
    // SQS polling mode
    await processEmailQueue(handleMessage);
  }
};

// Export for Lambda handler
module.exports.handler = async (event) => {
  console.log('Lambda invocation:', JSON.stringify(event));
  
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    await handleMessage(message);
  }
  
  return { statusCode: 200, body: 'Messages processed' };
};

// Export for testing
module.exports.sendEmail = sendEmail;
module.exports.handleMessage = handleMessage;
module.exports.emailTemplates = emailTemplates;

// Start if running directly
if (require.main === module) {
  startWorker().catch(console.error);
}
