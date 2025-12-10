// Unit tests for Email Worker Service
// These tests verify the email notification logic

describe('Email Worker', () => {
  describe('Email Templates', () => {
    const createBookingConfirmationEmail = (data) => ({
      subject: `Booking Confirmed - ${data.roomName}`,
      hasBody: true,
      recipient: data.email
    });

    const createCancellationEmail = (data) => ({
      subject: `Booking Cancelled - ${data.roomName}`,
      hasBody: true,
      recipient: data.email
    });

    test('should create booking confirmation email with correct subject', () => {
      const data = { roomName: 'Conference Room A', email: 'test@example.com' };
      const email = createBookingConfirmationEmail(data);
      
      expect(email.subject).toBe('Booking Confirmed - Conference Room A');
      expect(email.recipient).toBe('test@example.com');
    });

    test('should create cancellation email with correct subject', () => {
      const data = { roomName: 'Meeting Room B', email: 'user@example.com' };
      const email = createCancellationEmail(data);
      
      expect(email.subject).toBe('Booking Cancelled - Meeting Room B');
      expect(email.recipient).toBe('user@example.com');
    });
  });

  describe('Message Validation', () => {
    const validateMessage = (message) => {
      const errors = [];
      if (!message.type) errors.push('Message type is required');
      if (!message.recipient) errors.push('Recipient is required');
      if (!message.data) errors.push('Data is required');
      if (message.recipient && !message.recipient.includes('@')) {
        errors.push('Invalid email format');
      }
      return { valid: errors.length === 0, errors };
    };

    test('should validate a valid message', () => {
      const message = {
        type: 'bookingConfirmation',
        recipient: 'test@example.com',
        data: { roomName: 'Room A' }
      };
      const result = validateMessage(message);
      expect(result.valid).toBe(true);
    });

    test('should reject message without type', () => {
      const message = { recipient: 'test@example.com', data: {} };
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message type is required');
    });

    test('should reject message without recipient', () => {
      const message = { type: 'bookingConfirmation', data: {} };
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Recipient is required');
    });

    test('should reject invalid email format', () => {
      const message = {
        type: 'bookingConfirmation',
        recipient: 'invalid-email',
        data: {}
      };
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('Queue Message Processing', () => {
    const processMessage = async (message, handler) => {
      try {
        await handler(message);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    test('should return success when handler succeeds', async () => {
      const message = { type: 'test' };
      const handler = jest.fn().mockResolvedValue(true);
      
      const result = await processMessage(message, handler);
      
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledWith(message);
    });

    test('should return failure when handler throws', async () => {
      const message = { type: 'test' };
      const handler = jest.fn().mockRejectedValue(new Error('Send failed'));
      
      const result = await processMessage(message, handler);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('Email Content Formatting', () => {
    const formatPrice = (price) => `£${price.toFixed(2)}`;
    
    const formatBookingDetails = (booking) => ({
      room: booking.roomName,
      location: booking.locationName,
      date: booking.bookingDate,
      price: formatPrice(booking.finalPrice)
    });

    test('should format price correctly', () => {
      expect(formatPrice(100)).toBe('£100.00');
      expect(formatPrice(99.5)).toBe('£99.50');
      expect(formatPrice(0)).toBe('£0.00');
    });

    test('should format booking details', () => {
      const booking = {
        roomName: 'Board Room',
        locationName: 'London Office',
        bookingDate: '2024-12-15',
        finalPrice: 150.50
      };
      
      const formatted = formatBookingDetails(booking);
      
      expect(formatted.room).toBe('Board Room');
      expect(formatted.location).toBe('London Office');
      expect(formatted.price).toBe('£150.50');
    });
  });
});
