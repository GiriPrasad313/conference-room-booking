const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:localdev123@localhost:27017/bookings?authSource=admin';

const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Booking Service connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

module.exports = {
  connectDatabase,
  mongoose
};
