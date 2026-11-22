export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';
export type DataMode = 'DEMO' | 'LIVE';
export type BusValidityState = 'LIVE' | 'DELAYED' | 'OFFLINE';
export type BusStatus = 'On Time' | 'Delayed' | 'Scheduled' | 'Breakdown' | 'Completed';
export type TicketStatus = 'Upcoming' | 'Completed' | 'Cancelled';
export type LanguageCode = 'en' | 'ta' | 'hi';

export interface BusStop {
  stop_id: string;
  name: string;
  code: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  sequence: number;
}

export interface RouteStopTiming {
  stop_id: string;
  name: string;
  scheduled_time: string;
  distance_km: number;
  latitude: number;
  longitude: number;
}

export interface RouteDefinition {
  route_id: string;
  route_number: string;
  name: string;
  origin: string;
  destination: string;
  distance_km: number;
  typical_duration: string;
  base_fare: number;
  via: string[];
  stops: RouteStopTiming[];
  polyline: [number, number][];
}

export interface BusRecord {
  bus_id: string;
  bus_number: string;
  bus_operator: string;
  bus_type: 'Express' | 'Deluxe Non-AC' | 'AC Seater' | 'Superfast' | 'Town Shuttle';
  route_id: string;
  origin: string;
  destination: string;
  stops: RouteStopTiming[];
  departure_time: string;
  arrival_time: string;
  duration: string;
  duration_minutes: number;
  fare: number;
  operating_days: string[];
  available_seats: number;
  total_seats: number;
  status: BusStatus;
  validity_state: BusValidityState;
  delay_minutes: number;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_deg: number;
  current_stop_index: number;
  current_stop_name: string;
  next_stop_name: string;
  distance_to_next_km: number;
  eta_minutes: number;
  is_trip_active: boolean;
  is_simulated: boolean;
  data_mode: DataMode;
  driver_id?: string;
  last_updated: string;
}

export interface ScheduleItem {
  schedule_id: string;
  bus_id: string;
  bus_number: string;
  route_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  fare: number;
  bus_type: string;
  operating_days: string[];
  status: BusStatus;
  available_seats: number;
}

export interface TicketRecord {
  ticket_id: string;
  user_id: string;
  bus_id: string;
  bus_number: string;
  route_name: string;
  origin: string;
  destination: string;
  travel_date: string;
  departure_time: string;
  passenger_name: string;
  passenger_age: number;
  passenger_gender: 'Male' | 'Female' | 'Other';
  passenger_phone: string;
  seat_number: string;
  fare: number;
  payment_method: 'UPI' | 'Card' | 'Net Banking';
  payment_mode: 'Demo Payment';
  status: TicketStatus;
  qr_token: string;
  created_at: string;
}

export interface AppNotification {
  notification_id: string;
  type: 'ARRIVING' | 'DELAY' | 'ROUTE_CHANGE' | 'BOOKING' | 'CANCELLED' | 'CONNECTION' | 'EMERGENCY';
  title: string;
  message: string;
  bus_number?: string;
  created_at: string;
  read: boolean;
  is_demo: boolean;
}

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  favorite_buses: string[];
  favorite_stops: string[];
  saved_routes: string[];
  preferred_language: LanguageCode;
  offline_auto_sync: boolean;
}

export interface EtaResponse {
  bus_id: string;
  bus_number: string;
  current_stop: string;
  next_stop: string;
  distance_to_next_km: number;
  distance_to_destination_km: number;
  average_speed_kmh: number;
  estimated_eta_minutes: number;
  destination_eta_minutes: number;
  delay_minutes: number;
  label: 'Estimated ETA';
  prediction_engine: 'DISTANCE_SPEED_PROTOTYPE';
  ml_ready_features: {
    time_of_day_bucket: string;
    day_of_week: string;
    corridor_id: string;
  };
  data_mode: DataMode;
  is_simulated: boolean;
  calculated_at: string;
}
