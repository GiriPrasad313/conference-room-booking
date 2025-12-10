const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const roomController = require('../controllers/room.controller');

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
const roomValidation = [
  body('locationId').isUUID().withMessage('Valid location ID is required'),
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
  body('description').optional().trim(),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array')
];

const uuidValidation = [
  param('id').isUUID().withMessage('Invalid room ID')
];

const locationUuidValidation = [
  param('locationId').isUUID().withMessage('Invalid location ID')
];

// Routes
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'rooms-service', timestamp: new Date().toISOString() });
});
router.get('/', roomController.getAllRooms);
router.get('/search', roomController.searchRooms);
router.get('/:id', uuidValidation, validate, roomController.getRoomById);
router.get('/location/:locationId', locationUuidValidation, validate, roomController.getRoomsByLocation);
router.post('/', roomValidation, validate, roomController.createRoom);
router.put('/:id', uuidValidation, roomValidation, validate, roomController.updateRoom);
router.delete('/:id', uuidValidation, validate, roomController.deleteRoom);

module.exports = router;
