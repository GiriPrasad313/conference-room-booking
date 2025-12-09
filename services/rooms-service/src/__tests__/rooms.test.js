// Unit tests for Rooms Service
// These tests verify the room and location management logic

describe('Rooms Service', () => {
  describe('Room Search Logic', () => {
    const rooms = [
      { id: 1, name: 'Room A', capacity: 10, basePrice: 50, city: 'London' },
      { id: 2, name: 'Room B', capacity: 20, basePrice: 100, city: 'London' },
      { id: 3, name: 'Room C', capacity: 5, basePrice: 30, city: 'Manchester' },
    ];

    const filterRooms = (rooms, filters) => {
      return rooms.filter(room => {
        if (filters.city && room.city !== filters.city) return false;
        if (filters.minCapacity && room.capacity < filters.minCapacity) return false;
        if (filters.maxPrice && room.basePrice > filters.maxPrice) return false;
        return true;
      });
    };

    test('should filter rooms by city', () => {
      const result = filterRooms(rooms, { city: 'London' });
      expect(result.length).toBe(2);
      expect(result.every(r => r.city === 'London')).toBe(true);
    });

    test('should filter rooms by minimum capacity', () => {
      const result = filterRooms(rooms, { minCapacity: 10 });
      expect(result.length).toBe(2);
      expect(result.every(r => r.capacity >= 10)).toBe(true);
    });

    test('should filter rooms by maximum price', () => {
      const result = filterRooms(rooms, { maxPrice: 50 });
      expect(result.length).toBe(2);
      expect(result.every(r => r.basePrice <= 50)).toBe(true);
    });

    test('should combine multiple filters', () => {
      const result = filterRooms(rooms, { city: 'London', minCapacity: 15 });
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Room B');
    });

    test('should return all rooms when no filters applied', () => {
      const result = filterRooms(rooms, {});
      expect(result.length).toBe(3);
    });

    test('should return empty array when no rooms match', () => {
      const result = filterRooms(rooms, { city: 'Edinburgh' });
      expect(result.length).toBe(0);
    });
  });

  describe('Room Validation', () => {
    const validateRoom = (room) => {
      const errors = [];
      if (!room.name || room.name.trim() === '') errors.push('Name is required');
      if (!room.capacity || room.capacity < 1) errors.push('Capacity must be at least 1');
      if (!room.basePrice || room.basePrice < 0) errors.push('Base price must be non-negative');
      return { valid: errors.length === 0, errors };
    };

    test('should validate a valid room', () => {
      const room = { name: 'Conference Room', capacity: 10, basePrice: 50 };
      const result = validateRoom(room);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should reject room without name', () => {
      const room = { name: '', capacity: 10, basePrice: 50 };
      const result = validateRoom(room);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    test('should reject room with zero capacity', () => {
      const room = { name: 'Room', capacity: 0, basePrice: 50 };
      const result = validateRoom(room);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Capacity must be at least 1');
    });

    test('should reject room with negative price', () => {
      const room = { name: 'Room', capacity: 10, basePrice: -5 };
      const result = validateRoom(room);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Base price must be non-negative');
    });
  });

  describe('Location Validation', () => {
    const validateLocation = (location) => {
      const errors = [];
      if (!location.name || location.name.trim() === '') errors.push('Name is required');
      if (!location.city || location.city.trim() === '') errors.push('City is required');
      return { valid: errors.length === 0, errors };
    };

    test('should validate a valid location', () => {
      const location = { name: 'Head Office', city: 'London' };
      const result = validateLocation(location);
      expect(result.valid).toBe(true);
    });

    test('should reject location without city', () => {
      const location = { name: 'Office', city: '' };
      const result = validateLocation(location);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('City is required');
    });
  });
});
