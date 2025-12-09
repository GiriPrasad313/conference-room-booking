/**
 * SQS Queue Processor for Email Worker
 * Polls messages from AWS SQS and processes them
 */

const AWS = require('aws-sdk');

const QUEUE_URL = process.env.SQS_QUEUE_URL;
const REGION = process.env.AWS_REGION || 'us-east-1';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 20; // Long polling (max 20 seconds)
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES) || 10;

// Configure AWS
AWS.config.update({ region: REGION });

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

/**
 * Receive messages from SQS queue
 */
const receiveMessages = async () => {
  const params = {
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: MAX_MESSAGES,
    WaitTimeSeconds: POLL_INTERVAL,
    VisibilityTimeout: 30
  };

  try {
    const data = await sqs.receiveMessage(params).promise();
    return data.Messages || [];
  } catch (error) {
    console.error('Error receiving messages:', error.message);
    return [];
  }
};

/**
 * Delete a message from the queue after successful processing
 */
const deleteMessage = async (receiptHandle) => {
  const params = {
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle
  };

  try {
    await sqs.deleteMessage(params).promise();
    console.log('Message deleted from queue');
  } catch (error) {
    console.error('Error deleting message:', error.message);
  }
};

/**
 * Process email queue continuously
 */
const processEmailQueue = async (messageHandler) => {
  if (!QUEUE_URL) {
    console.error('SQS_QUEUE_URL environment variable not set');
    process.exit(1);
  }

  console.log(`Starting SQS polling from ${QUEUE_URL}`);
  
  while (true) {
    try {
      const messages = await receiveMessages();
      
      if (messages.length > 0) {
        console.log(`Received ${messages.length} messages`);
        
        for (const message of messages) {
          try {
            const body = JSON.parse(message.Body);
            const result = await messageHandler(body);
            
            if (result.success) {
              await deleteMessage(message.ReceiptHandle);
            } else {
              console.error('Message processing failed, leaving in queue for retry');
            }
          } catch (error) {
            console.error('Error processing message:', error.message);
          }
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error.message);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

/**
 * Send a message to the queue (for other services to use)
 */
const sendToQueue = async (messageBody) => {
  if (!QUEUE_URL) {
    console.log('SQS not configured, skipping queue send');
    return null;
  }

  const params = {
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(messageBody),
    MessageGroupId: 'email-notifications' // For FIFO queues
  };

  try {
    const result = await sqs.sendMessage(params).promise();
    console.log('Message sent to queue:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error sending message to queue:', error.message);
    throw error;
  }
};

module.exports = {
  processEmailQueue,
  sendToQueue,
  receiveMessages,
  deleteMessage
};
