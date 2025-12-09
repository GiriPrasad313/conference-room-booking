const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Get all rooms with pagination
const getAllRooms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) FROM conference_rooms WHERE is_active = true');
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT r.room_id, r.location_id, r.name, r.description, r.capacity, 
              r.base_price, r.amenities, r.is_active, r.created_at, r.updated_at,
              l.name as location_name, l.city as location_city
       FROM conference_rooms r
       JOIN locations l ON r.location_id = l.location_id
       WHERE r.is_active = true
       ORDER BY l.city, r.name
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      count: result.rows.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      rooms: result.rows.map(formatRoom)
    });
  } catch (error) {
    console.error('Get all rooms error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch rooms' } });
  }
};

// Search rooms with filters
const searchRooms = async (req, res) => {
  try {
    const { city, minCapacity, maxPrice, amenities } = req.query;
    
    let queryText = `
      SELECT r.room_id, r.location_id, r.name, r.description, r.capacity, 
             r.base_price, r.amenities, r.is_active, r.created_at, r.updated_at,
             l.name as location_name, l.city as location_city
      FROM conference_rooms r
      JOIN locations l ON r.location_id = l.location_id
      WHERE r.is_active = true
    `;
    const params = [];
    let paramIndex = 1;

    if (city) {
      queryText += ` AND LOWER(l.city) = LOWER($${paramIndex})`;
      params.push(city);
      paramIndex++;
    }

    if (minCapacity) {
      queryText += ` AND r.capacity >= $${paramIndex}`;
      params.push(parseInt(minCapacity));
      paramIndex++;
    }

    if (maxPrice) {
      queryText += ` AND r.base_price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim());
      queryText += ` AND r.amenities @> $${paramIndex}`;
      params.push(amenityList);
      paramIndex++;
    }

    queryText += ' ORDER BY r.base_price ASC';

    const result = await query(queryText, params);

    res.json({
      count: result.rows.length,
      filters: { city, minCapacity, maxPrice, amenities },
      rooms: result.rows.map(formatRoom)
    });
  } catch (error) {
    console.error('Search rooms error:', error);
    res.status(500).json({ error: { message: 'Failed to search rooms' } });
  }
};

// Get room by ID
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.room_id, r.location_id, r.name, r.description, r.capacity, 
              r.base_price, r.amenities, r.is_active, r.created_at, r.updated_at,
              l.name as location_name, l.city as location_city, l.address as location_address
       FROM conference_rooms r
       JOIN locations l ON r.location_id = l.location_id
       WHERE r.room_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Room not found' } });
    }

    res.json(formatRoom(result.rows[0], true));
  } catch (error) {
    console.error('Get room by ID error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch room' } });
  }
};

// Get rooms by location
const getRoomsByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    // Verify location exists
    const locationResult = await query(
      'SELECT location_id, name, city FROM locations WHERE location_id = $1',
      [locationId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Location not found' } });
    }

    const result = await query(
      `SELECT room_id, location_id, name, description, capacity, 
              base_price, amenities, is_active, created_at, updated_at
       FROM conference_rooms
       WHERE location_id = $1 AND is_active = true
       ORDER BY name`,
      [locationId]
    );

    const location = locationResult.rows[0];
    res.json({
      location: {
        locationId: location.location_id,
        name: location.name,
        city: location.city
      },
      count: result.rows.length,
      rooms: result.rows.map(room => formatRoom({
        ...room,
        location_name: location.name,
        location_city: location.city
      }))
    });
  } catch (error) {
    console.error('Get rooms by location error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch rooms' } });
  }
};

// Create new room
const createRoom = async (req, res) => {
  try {
    const { locationId, name, description, capacity, basePrice, amenities = [] } = req.body;
    
    // Verify location exists
    const locationResult = await query(
      'SELECT location_id FROM locations WHERE location_id = $1',
      [locationId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(400).json({ error: { message: 'Location not found' } });
    }

    const roomId = uuidv4();
    const result = await query(
      `INSERT INTO conference_rooms (room_id, location_id, name, description, capacity, base_price, amenities)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING room_id, location_id, name, description, capacity, base_price, amenities, is_active, created_at`,
      [roomId, locationId, name, description, capacity, basePrice, amenities]
    );

    const room = result.rows[0];
    res.status(201).json({
      message: 'Room created successfully',
      room: {
        roomId: room.room_id,
        locationId: room.location_id,
        name: room.name,
        description: room.description,
        capacity: room.capacity,
        basePrice: parseFloat(room.base_price),
        amenities: room.amenities,
        isActive: room.is_active,
        createdAt: room.created_at
      }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: { message: 'Failed to create room' } });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { locationId, name, description, capacity, basePrice, amenities } = req.body;

    const result = await query(
      `UPDATE conference_rooms
       SET location_id = $1, name = $2, description = $3, capacity = $4, 
           base_price = $5, amenities = $6, updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $7
       RETURNING room_id, location_id, name, description, capacity, base_price, amenities, is_active, created_at, updated_at`,
      [locationId, name, description, capacity, basePrice, amenities, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Room not found' } });
    }

    const room = result.rows[0];
    res.json({
      message: 'Room updated successfully',
      room: {
        roomId: room.room_id,
        locationId: room.location_id,
        name: room.name,
        description: room.description,
        capacity: room.capacity,
        basePrice: parseFloat(room.base_price),
        amenities: room.amenities,
        isActive: room.is_active,
        createdAt: room.created_at,
        updatedAt: room.updated_at
      }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: { message: 'Failed to update room' } });
  }
};

// Delete room (soft delete)
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE conference_rooms 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE room_id = $1 
       RETURNING room_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Room not found' } });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: { message: 'Failed to delete room' } });
  }
};

// Helper function to format room response
const formatRoom = (room, includeLocationAddress = false) => {
  const formatted = {
    roomId: room.room_id,
    locationId: room.location_id,
    name: room.name,
    description: room.description,
    capacity: room.capacity,
    basePrice: parseFloat(room.base_price),
    amenities: room.amenities,
    isActive: room.is_active,
    location: {
      name: room.location_name,
      city: room.location_city
    },
    createdAt: room.created_at,
    updatedAt: room.updated_at
  };

  if (includeLocationAddress && room.location_address) {
    formatted.location.address = room.location_address;
  }

  return formatted;
};

module.exports = {
  getAllRooms,
  searchRooms,
  getRoomById,
  getRoomsByLocation,
  createRoom,
  updateRoom,
  deleteRoom
};
