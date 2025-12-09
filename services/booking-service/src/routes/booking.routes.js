const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: { 
        message: 'Validation failed', 
        details: errors.array() 
      } 
    });
  }
  next();
};

// Validation rules
const createBookingValidation = [
  body('roomId').isUUID().withMessage('Valid room ID is required'),
  body('bookingDate')
    .isISO8601()
    .withMessage('Valid booking date is required (YYYY-MM-DD)')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) {
        throw new Error('Booking date cannot be in the past');
      }
      return true;
    }),
  body('notes').optional().trim().isLength({ max: 500 })
];

const bookingIdValidation = [
  param('id').notEmpty().withMessage('Booking ID is required')
];

// Routes - All routes require authentication
router.use(authenticateToken);

// User routes
router.post('/', createBookingValidation, validate, bookingController.createBooking);
router.get('/', bookingController.getUserBookings);
router.get('/:id', bookingIdValidation, validate, bookingController.getBookingById);
router.put('/:id/cancel', bookingIdValidation, validate, bookingController.cancelBooking);

// Availability check (public within authenticated users)
router.get('/room/:roomId/availability', bookingController.checkAvailability);

module.exports = router;
