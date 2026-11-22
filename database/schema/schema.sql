-- BUSPulse Relational Database Schema (PostgreSQL / MySQL Compatible)
-- Entities: User, Driver, Bus, Route, BusStop, Schedule, LiveLocation,
--           Ticket, Passenger, Notification, FavoriteRoute, FavoriteBus

CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(24) NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN')),
  preferred_language VARCHAR(8) NOT NULL DEFAULT 'en',
  offline_auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  driver_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  license_number VARCHAR(64) NOT NULL UNIQUE,
  assigned_bus_id VARCHAR(64),
  duty_status VARCHAR(32) NOT NULL DEFAULT 'OFF_DUTY'
);

CREATE TABLE IF NOT EXISTS routes (
  route_id VARCHAR(64) PRIMARY KEY,
  route_number VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  origin VARCHAR(80) NOT NULL,
  destination VARCHAR(80) NOT NULL,
  distance_km DECIMAL(6, 2) NOT NULL,
  typical_duration VARCHAR(32) NOT NULL,
  base_fare DECIMAL(8, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS bus_stops (
  stop_id VARCHAR(64) PRIMARY KEY,
  route_id VARCHAR(64) NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(16) NOT NULL,
  city VARCHAR(80) NOT NULL,
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  distance_km DECIMAL(6, 2) NOT NULL,
  sequence_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS buses (
  bus_id VARCHAR(64) PRIMARY KEY,
  bus_number VARCHAR(32) NOT NULL UNIQUE,
  bus_operator VARCHAR(120) NOT NULL,
  bus_type VARCHAR(40) NOT NULL,
  route_id VARCHAR(64) NOT NULL REFERENCES routes(route_id),
  total_seats INT NOT NULL DEFAULT 44,
  available_seats INT NOT NULL DEFAULT 44,
  fare DECIMAL(8, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Scheduled',
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  data_mode VARCHAR(16) NOT NULL DEFAULT 'DEMO'
);

CREATE TABLE IF NOT EXISTS schedules (
  schedule_id VARCHAR(64) PRIMARY KEY,
  bus_id VARCHAR(64) NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,
  route_id VARCHAR(64) NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  departure_time VARCHAR(16) NOT NULL,
  arrival_time VARCHAR(16) NOT NULL,
  duration_minutes INT NOT NULL,
  operating_days VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS live_locations (
  location_id VARCHAR(64) PRIMARY KEY,
  bus_id VARCHAR(64) NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 0,
  heading_deg DECIMAL(5, 2) NOT NULL DEFAULT 0,
  current_stop_name VARCHAR(120),
  next_stop_name VARCHAR(120),
  delay_minutes INT NOT NULL DEFAULT 0,
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS passengers (
  passenger_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(user_id) ON DELETE SET NULL,
  full_name VARCHAR(120) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(16) NOT NULL,
  phone VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
  bus_id VARCHAR(64) NOT NULL REFERENCES buses(bus_id),
  passenger_id VARCHAR(64) NOT NULL REFERENCES passengers(passenger_id),
  travel_date DATE NOT NULL,
  departure_time VARCHAR(16) NOT NULL,
  seat_number VARCHAR(12) NOT NULL,
  fare DECIMAL(8, 2) NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'Demo Payment',
  status VARCHAR(24) NOT NULL CHECK (status IN ('Upcoming', 'Completed', 'Cancelled')),
  qr_token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  bus_number VARCHAR(32),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorite_routes (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  route_id VARCHAR(64) NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorite_buses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  bus_id VARCHAR(64) NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_live_locations_bus_time ON live_locations(bus_id, recorded_at DESC);
CREATE INDEX idx_tickets_user_status ON tickets(user_id, status);
CREATE INDEX idx_schedules_route ON schedules(route_id);
