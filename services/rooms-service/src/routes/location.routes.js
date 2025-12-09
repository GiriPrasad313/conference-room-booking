const express = require('express');
const { body, param, validationResult } = require('express-validator');
const locationController = require('../controllers/location.controller');

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
const locationValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
  body('address').trim().isLength({ min: 1 }).withMessage('Address is required'),
  body('city').trim().isLength({ min: 1, max: 100 }).withMessage('City is required'),
  body('country').optional().trim().isLength({ max: 100 }),
  body('timezone').optional().trim().isLength({ max: 50 })
];

const uuidValidation = [
  param('id').isUUID().withMessage('Invalid location ID')
];

// Routes
router.get('/', locationController.getAllLocations);
router.get('/:id', uuidValidation, validate, locationController.getLocationById);
router.post('/', locationValidation, validate, locationController.createLocation);
router.put('/:id', uuidValidation, locationValidation, validate, locationController.updateLocation);
router.delete('/:id', uuidValidation, validate, locationController.deleteLocation);

module.exports = router;
