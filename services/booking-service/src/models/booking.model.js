const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  roomName: {
    type: String,
    required: true
  },
  locationId: {
    type: String,
    required: true
  },
  locationName: {
    type: String,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true,
    index: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  weatherAdjustment: {
    type: Number,
    default: 0
  },
  finalPrice: {
    type: Number,
    required: true
  },
  forecastedTemp: {
    type: Number,
    default: null
  },
  weatherCondition: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed',
    index: true
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for checking availability
bookingSchema.index({ roomId: 1, bookingDate: 1, status: 1 });

// Update timestamp on save
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
