const { Pool } = require('pg');

// Configure SSL for RDS connections
const isRDS = process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'localdev123',
  database: process.env.DB_NAME || 'conferencedb',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRDS ? { rejectUnauthorized: false } : false,
});

// Test database connection
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database' + (isRDS ? ' (AWS RDS)' : ''));
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
};

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initializeDatabase
};
