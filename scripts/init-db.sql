-- Conference Room Booking System - Database Initialization
-- PostgreSQL Schema for Users, Locations, and Conference Rooms

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'United Kingdom',
    timezone VARCHAR(50) DEFAULT 'Europe/London',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conference Rooms Table
CREATE TABLE IF NOT EXISTS conference_rooms (
    room_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    amenities TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_rooms_location ON conference_rooms(location_id);
CREATE INDEX IF NOT EXISTS idx_rooms_capacity ON conference_rooms(capacity);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON conference_rooms(is_active);

-- Seed data: Sample Locations
INSERT INTO locations (location_id, name, address, city, country, timezone) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'London HQ', '123 Business Park, Canary Wharf', 'London', 'United Kingdom', 'Europe/London'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Manchester Office', '456 Innovation Centre, Spinningfields', 'Manchester', 'United Kingdom', 'Europe/London'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Edinburgh Branch', '789 Tech Hub, Quartermile', 'Edinburgh', 'United Kingdom', 'Europe/London'),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Birmingham Centre', '321 Enterprise Zone, Brindleyplace', 'Birmingham', 'United Kingdom', 'Europe/London')
ON CONFLICT (location_id) DO NOTHING;

-- Seed data: Sample Conference Rooms
INSERT INTO conference_rooms (room_id, location_id, name, description, capacity, base_price, amenities) VALUES
    -- London HQ Rooms
    ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Thames Room', 'Large conference room with river views', 20, 150.00, ARRAY['projector', 'whiteboard', 'video_conferencing', 'catering']),
    ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Victoria Room', 'Medium meeting room', 10, 75.00, ARRAY['projector', 'whiteboard', 'tv_screen']),
    ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Westminster Suite', 'Executive boardroom', 12, 200.00, ARRAY['projector', 'whiteboard', 'video_conferencing', 'catering', 'phone_conferencing']),
    
    -- Manchester Office Rooms
    ('44444444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Deansgate Room', 'Modern conference space', 15, 100.00, ARRAY['projector', 'whiteboard', 'video_conferencing']),
    ('55555555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Piccadilly Room', 'Compact meeting room', 6, 50.00, ARRAY['tv_screen', 'whiteboard']),
    
    -- Edinburgh Branch Rooms
    ('66666666-6666-6666-6666-666666666666', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Castle View', 'Premium room with castle views', 18, 175.00, ARRAY['projector', 'whiteboard', 'video_conferencing', 'catering']),
    ('77777777-7777-7777-7777-777777777777', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Royal Mile Room', 'Standard conference room', 12, 85.00, ARRAY['projector', 'whiteboard']),
    
    -- Birmingham Centre Rooms
    ('88888888-8888-8888-8888-888888888888', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Bullring Suite', 'Large event space', 30, 250.00, ARRAY['projector', 'whiteboard', 'video_conferencing', 'catering', 'stage']),
    ('99999999-9999-9999-9999-999999999999', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Canal Room', 'Waterside meeting room', 8, 60.00, ARRAY['tv_screen', 'whiteboard'])
ON CONFLICT (room_id) DO NOTHING;

-- Create admin user (password: Admin123!)
-- Note: In production, create admin through secure process
INSERT INTO users (user_id, email, password_hash, first_name, last_name, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@conferencerooms.com', '$2b$10$rQZ9QwYfP3MZfVnVvZJ8aeYzPZDMhqYwJzNxS5C7lV1QT8JHkxZGe', 'System', 'Admin', 'admin')
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
