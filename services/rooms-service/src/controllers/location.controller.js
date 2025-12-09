const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Get all locations
const getAllLocations = async (req, res) => {
  try {
    const result = await query(
      `SELECT location_id, name, address, city, country, timezone, created_at, updated_at
       FROM locations
       ORDER BY name ASC`
    );

    res.json({
      count: result.rows.length,
      locations: result.rows.map(loc => ({
        locationId: loc.location_id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        country: loc.country,
        timezone: loc.timezone,
        createdAt: loc.created_at,
        updatedAt: loc.updated_at
      }))
    });
  } catch (error) {
    console.error('Get all locations error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch locations' } });
  }
};

// Get location by ID
const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT location_id, name, address, city, country, timezone, created_at, updated_at
       FROM locations
       WHERE location_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Location not found' } });
    }

    const loc = result.rows[0];
    res.json({
      locationId: loc.location_id,
      name: loc.name,
      address: loc.address,
      city: loc.city,
      country: loc.country,
      timezone: loc.timezone,
      createdAt: loc.created_at,
      updatedAt: loc.updated_at
    });
  } catch (error) {
    console.error('Get location by ID error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch location' } });
  }
};

// Create new location
const createLocation = async (req, res) => {
  try {
    const { name, address, city, country = 'United Kingdom', timezone = 'Europe/London' } = req.body;
    const locationId = uuidv4();

    const result = await query(
      `INSERT INTO locations (location_id, name, address, city, country, timezone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING location_id, name, address, city, country, timezone, created_at`,
      [locationId, name, address, city, country, timezone]
    );

    const loc = result.rows[0];
    res.status(201).json({
      message: 'Location created successfully',
      location: {
        locationId: loc.location_id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        country: loc.country,
        timezone: loc.timezone,
        createdAt: loc.created_at
      }
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: { message: 'Failed to create location' } });
  }
};

// Update location
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, timezone } = req.body;

    const result = await query(
      `UPDATE locations
       SET name = $1, address = $2, city = $3, country = $4, timezone = $5, updated_at = CURRENT_TIMESTAMP
       WHERE location_id = $6
       RETURNING location_id, name, address, city, country, timezone, created_at, updated_at`,
      [name, address, city, country, timezone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Location not found' } });
    }

    const loc = result.rows[0];
    res.json({
      message: 'Location updated successfully',
      location: {
        locationId: loc.location_id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        country: loc.country,
        timezone: loc.timezone,
        createdAt: loc.created_at,
        updatedAt: loc.updated_at
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: { message: 'Failed to update location' } });
  }
};

// Delete location
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM locations WHERE location_id = $1 RETURNING location_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Location not found' } });
    }

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: { message: 'Cannot delete location with associated rooms' } 
      });
    }
    res.status(500).json({ error: { message: 'Failed to delete location' } });
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
};
