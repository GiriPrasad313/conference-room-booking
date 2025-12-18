const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// AWS SDK for sending notifications
const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const sqs = new AWS.SQS();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || '';

// Send welcome notification to SQS
const sendWelcomeNotification = async (user) => {
  if (!SQS_QUEUE_URL) {
    console.log('SQS_QUEUE_URL not configured, skipping welcome notification');
    return;
  }
  
  try {
    const message = {
      bookingId: `welcome-${user.userId}`,
      userEmail: user.email,
      userName: user.firstName,
      roomName: 'ConferenceBook',
      locationName: 'Welcome',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      eventType: 'USER_REGISTERED'
    };
    
    await sqs.sendMessage({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify(message)
    }).promise();
    
    console.log(`Welcome notification sent for user ${user.email}`);
  } catch (error) {
    console.error('Failed to send welcome notification:', error.message);
    // Don't fail registration if notification fails
  }
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.user_id, 
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.user_id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: { message: 'User with this email already exists' } 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (user_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, first_name, last_name, role, created_at`,
      [userId, email, passwordHash, firstName, lastName, 'user']
    );

    const user = result.rows[0];
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Send welcome email notification
    await sendWelcomeNotification({
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: { message: 'Failed to register user' } 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: { message: 'Invalid email or password' } 
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: { message: 'Invalid email or password' } 
      });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: 'Login successful',
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: { message: 'Failed to login' } 
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: { message: 'Refresh token is required' } 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: { message: 'Invalid refresh token' } 
      });
    }

    // Get user
    const result = await query(
      'SELECT * FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: { message: 'User not found' } 
      });
    }

    const user = result.rows[0];
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: { message: 'Refresh token expired' } 
      });
    }
    console.error('Refresh token error:', error);
    res.status(401).json({ 
      error: { message: 'Invalid refresh token' } 
    });
  }
};

// Validate token (for internal service calls)
const validateToken = async (req, res) => {
  // Token is already validated by middleware
  res.json({
    valid: true,
    user: req.user
  });
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const result = await query(
      'SELECT user_id, email, first_name, last_name, role, created_at FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { message: 'User not found' } 
      });
    }

    const user = result.rows[0];
    res.json({
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: { message: 'Failed to get user information' } 
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  validateToken,
  getCurrentUser
};
