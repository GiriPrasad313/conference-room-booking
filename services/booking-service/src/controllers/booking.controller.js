const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Booking = require('../models/booking.model');

const WEATHER_SERVICE_URL = process.env.WEATHER_SERVICE_URL || 'http://localhost:5000';
const ROOMS_SERVICE_URL = process.env.ROOMS_SERVICE_URL || 'http://localhost:3002';
const OPTIMAL_TEMPERATURE = 21; // Optimal temperature in Celsius
const PRICE_ADJUSTMENT_PER_DEGREE = 0.5; // Price adjustment per degree difference
const FALLBACK_SURCHARGE_PERCENT = 0.1; // 10% fallback surcharge if weather unavailable

// Get room details from Rooms Service
const getRoomDetails = async (roomId) => {
  try {
    const response = await axios.get(`${ROOMS_SERVICE_URL}/api/rooms/${roomId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch room details:', error.message);
    throw new Error('Room not found or service unavailable');
  }
};

// Get weather forecast from Weather Service
const getWeatherForecast = async (locationId, date) => {
  try {
    const response = await axios.get(`${WEATHER_SERVICE_URL}/api/weather/forecast`, {
      params: { locationId, date }
    });
    return response.data;
  } catch (error) {
    console.error('Weather service unavailable:', error.message);
    return null; // Return null to trigger fallback pricing
  }
};

// Calculate dynamic price based on weather
const calculateDynamicPrice = (basePrice, weatherData) => {
  if (!weatherData || weatherData.temperature === undefined) {
    // Fallback: 10% surcharge if weather unavailable
    const adjustment = basePrice * FALLBACK_SURCHARGE_PERCENT;
    return {
      finalPrice: parseFloat((basePrice + adjustment).toFixed(2)),
      weatherAdjustment: parseFloat(adjustment.toFixed(2)),
      forecastedTemp: null,
      weatherCondition: null,
      fallbackUsed: true
    };
  }

  const tempDifference = Math.abs(weatherData.temperature - OPTIMAL_TEMPERATURE);
  const adjustment = tempDifference * PRICE_ADJUSTMENT_PER_DEGREE;
  
  return {
    finalPrice: parseFloat((basePrice + adjustment).toFixed(2)),
    weatherAdjustment: parseFloat(adjustment.toFixed(2)),
    forecastedTemp: weatherData.temperature,
    weatherCondition: weatherData.condition,
    fallbackUsed: false
  };
};

// Create new booking
const createBooking = async (req, res) => {
  try {
    const { roomId, bookingDate, notes } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Format date to start of day for comparison
    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);

    // Check if room exists and get details
    const room = await getRoomDetails(roomId);
    if (!room) {
      return res.status(404).json({ error: { message: 'Room not found' } });
    }

    // Check availability
    const existingBooking = await Booking.findOne({
      roomId,
      bookingDate: bookingDateObj,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(409).json({ 
        error: { message: 'Room is already booked for this date' } 
      });
    }

    // Get weather forecast and calculate price
    const weatherData = await getWeatherForecast(room.locationId, bookingDate);
    const pricing = calculateDynamicPrice(room.basePrice, weatherData);

    // Create booking
    const booking = new Booking({
      bookingId: uuidv4(),
      userId,
      userEmail,
      roomId,
      roomName: room.name,
      locationId: room.locationId,
      locationName: room.location.name,
      bookingDate: bookingDateObj,
      basePrice: room.basePrice,
      weatherAdjustment: pricing.weatherAdjustment,
      finalPrice: pricing.finalPrice,
      forecastedTemp: pricing.forecastedTemp,
      weatherCondition: pricing.weatherCondition,
      status: 'confirmed',
      notes: notes || ''
    });

    await booking.save();

    res.status(201).json({
      message: 'Booking created successfully',
      booking: formatBookingResponse(booking),
      pricing: {
        basePrice: room.basePrice,
        weatherAdjustment: pricing.weatherAdjustment,
        finalPrice: pricing.finalPrice,
        forecastedTemp: pricing.forecastedTemp,
        weatherCondition: pricing.weatherCondition,
        fallbackPricingUsed: pricing.fallbackUsed
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      error: { message: error.message || 'Failed to create booking' } 
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, fromDate, toDate } = req.query;

    const query = { userId };

    if (status) {
      query.status = status;
    }

    if (fromDate || toDate) {
      query.bookingDate = {};
      if (fromDate) query.bookingDate.$gte = new Date(fromDate);
      if (toDate) query.bookingDate.$lte = new Date(toDate);
    }

    const bookings = await Booking.find(query)
      .sort({ bookingDate: -1 })
      .limit(50);

    res.json({
      count: bookings.length,
      bookings: bookings.map(formatBookingResponse)
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch bookings' } });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({ bookingId: id });

    if (!booking) {
      return res.status(404).json({ error: { message: 'Booking not found' } });
    }

    // Only allow user to view their own bookings (unless admin)
    if (booking.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    res.json(formatBookingResponse(booking));
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch booking' } });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({ bookingId: id });

    if (!booking) {
      return res.status(404).json({ error: { message: 'Booking not found' } });
    }

    // Only allow user to cancel their own bookings
    if (booking.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: { message: 'Booking is already cancelled' } });
    }

    // Check if booking date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (booking.bookingDate < today) {
      return res.status(400).json({ error: { message: 'Cannot cancel past bookings' } });
    }

    booking.status = 'cancelled';
    booking.updatedAt = new Date();
    await booking.save();

    res.json({
      message: 'Booking cancelled successfully',
      booking: formatBookingResponse(booking)
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: { message: 'Failed to cancel booking' } });
  }
};

// Check room availability
const checkAvailability = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { month, year } = req.query;

    // Default to current month if not specified
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const bookings = await Booking.find({
      roomId,
      bookingDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    }).select('bookingDate');

    const bookedDates = bookings.map(b => b.bookingDate.toISOString().split('T')[0]);

    res.json({
      roomId,
      month: targetMonth,
      year: targetYear,
      bookedDates
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: { message: 'Failed to check availability' } });
  }
};

// Helper function to format booking response
const formatBookingResponse = (booking) => ({
  bookingId: booking.bookingId,
  userId: booking.userId,
  userEmail: booking.userEmail,
  room: {
    roomId: booking.roomId,
    name: booking.roomName
  },
  location: {
    locationId: booking.locationId,
    name: booking.locationName
  },
  bookingDate: booking.bookingDate.toISOString().split('T')[0],
  pricing: {
    basePrice: booking.basePrice,
    weatherAdjustment: booking.weatherAdjustment,
    finalPrice: booking.finalPrice
  },
  weather: {
    forecastedTemp: booking.forecastedTemp,
    condition: booking.weatherCondition
  },
  status: booking.status,
  notes: booking.notes,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt
});

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  checkAvailability
};
