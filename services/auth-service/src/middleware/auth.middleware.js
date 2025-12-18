const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ConferenceBookSecretKey2024ProductionSecure';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: { message: 'Access token is required' } 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: { message: 'Token has expired' } 
      });
    }
    return res.status(403).json({ 
      error: { message: 'Invalid token' } 
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: { message: 'Admin access required' } 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};
