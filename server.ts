import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  buildSchedulesFromBuses,
  INITIAL_BUSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ROUTES,
  INITIAL_TICKETS,
  SALEM_ERODE_STOPS,
} from './server/seedData.ts';
import type {
  AppNotification,
  AuthUser,
  BusRecord,
  BusStop,
  DataMode,
  EtaResponse,
  RouteDefinition,
  TicketRecord,
  UserRole,
} from './src/types/transit.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const DATA_MODE: DataMode = process.env.DATA_MODE === 'LIVE' ? 'LIVE' : 'DEMO';
const JWT_SECRET = process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'buspulse-state.json');

interface StoredUser extends AuthUser {
  password_hash: string;
}

interface PersistedState {
  buses: BusRecord[];
  routes: RouteDefinition[];
  stops: BusStop[];
  tickets: TicketRecord[];
  notifications: AppNotification[];
  users: StoredUser[];
  admin_claimed: boolean;
  daily_bookings_series: { day: string; bookings: number; revenue: number }[];
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

function signToken(payload: { sub: string; role: UserRole; exp: number }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): { sub: string; role: UserRole; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed?.sub || !parsed?.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeUser(user: StoredUser): AuthUser {
  const { password_hash: _pw, ...safe } = user;
  return safe;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateEta(bus: BusRecord): EtaResponse {
  const stops = bus.stops;
  const nextIdx = Math.min(bus.current_stop_index + 1, stops.length - 1);
  const nextStop = stops[nextIdx] || stops[stops.length - 1];
  const destStop = stops[stops.length - 1];
  const distToNext = Math.max(0.4, Number(haversineKm(bus.latitude, bus.longitude, nextStop.latitude, nextStop.longitude).toFixed(1)));
  const distToDest = Math.max(distToNext, Number(haversineKm(bus.latitude, bus.longitude, destStop.latitude, destStop.longitude).toFixed(1)));
  const avgSpeed = Math.max(22, bus.speed_kmh || 42);
  const baseEta = Math.max(1, Math.round((distToNext / avgSpeed) * 60) + (bus.status === 'Delayed' ? Math.round(bus.delay_minutes * 0.35) : 0));
  const destEta = Math.max(baseEta, Math.round((distToDest / avgSpeed) * 60) + bus.delay_minutes);

  const hour = new Date().getHours();
  const bucket = hour < 11 ? 'MORNING_PEAK' : hour < 16 ? 'MIDDAY' : hour < 20 ? 'EVENING_PEAK' : 'NIGHT';
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  return {
    bus_id: bus.bus_id,
    bus_number: bus.bus_number,
    current_stop: bus.current_stop_name,
    next_stop: nextStop.name,
    distance_to_next_km: distToNext,
    distance_to_destination_km: distToDest,
    average_speed_kmh: avgSpeed,
    estimated_eta_minutes: baseEta,
    destination_eta_minutes: destEta,
    delay_minutes: bus.delay_minutes,
    label: 'Estimated ETA',
    prediction_engine: 'DISTANCE_SPEED_PROTOTYPE',
    ml_ready_features: {
      time_of_day_bucket: bucket,
      day_of_week: dayOfWeek,
      corridor_id: bus.route_id,
    },
    data_mode: DATA_MODE,
    is_simulated: bus.is_simulated,
    calculated_at: new Date().toISOString(),
  };
}

function createInitialState(): PersistedState {
  const defaultUsers: StoredUser[] = [
    {
      user_id: 'USR-PSG-01',
      name: 'Mohan Raj',
      email: 'mohan@buspulse.demo',
      phone: '+91 98427 11204',
      role: 'PASSENGER',
      favorite_buses: ['DEMO-101', 'DEMO-103'],
      favorite_stops: ['Salem New Bus Stand', 'Sankari', 'Erode Central Bus Stand'],
      saved_routes: ['Salem → Erode'],
      preferred_language: 'en',
      offline_auto_sync: true,
      password_hash: '',
    },
    {
      user_id: 'USR-DRV-01',
      name: 'Karthik S.',
      email: 'driver.karthik@buspulse.demo',
      phone: '+91 94430 88120',
      role: 'DRIVER',
      favorite_buses: ['DEMO-101'],
      favorite_stops: ['Salem New Bus Stand', 'Erode Central Bus Stand'],
      saved_routes: ['Salem → Erode'],
      preferred_language: 'ta',
      offline_auto_sync: true,
      password_hash: '',
    },
    {
      user_id: 'USR-ADM-01',
      name: 'Transit Operations Lead',
      email: 'admin@buspulse.demo',
      phone: '+91 94421 00412',
      role: 'ADMIN',
      favorite_buses: [],
      favorite_stops: [],
      saved_routes: ['Salem → Erode'],
      preferred_language: 'en',
      offline_auto_sync: true,
      password_hash: '',
    },
  ];

  return {
    buses: INITIAL_BUSES,
    routes: INITIAL_ROUTES,
    stops: SALEM_ERODE_STOPS,
    tickets: INITIAL_TICKETS,
    notifications: INITIAL_NOTIFICATIONS,
    users: defaultUsers,
    admin_claimed: false,
    daily_bookings_series: [
      { day: 'Mon', bookings: 142, revenue: 14800 },
      { day: 'Tue', bookings: 168, revenue: 17450 },
      { day: 'Wed', bookings: 155, revenue: 16100 },
      { day: 'Thu', bookings: 189, revenue: 19900 },
      { day: 'Fri', bookings: 234, revenue: 24800 },
      { day: 'Sat', bookings: 268, revenue: 28100 },
      { day: 'Sun', bookings: 215, revenue: 22400 },
    ],
  };
}

function loadState(): PersistedState {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && Array.isArray(parsed.buses) && Array.isArray(parsed.routes)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to clean initial state
  }
  const initial = createInitialState();
  saveState(initial);
  return initial;
}

function saveState(state: PersistedState): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Non-fatal in ephemeral containers
  }
}

async function startServer() {
  const state = loadState();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const busProgressMap = new Map<string, number>();
  state.buses.forEach((b, idx) => {
    busProgressMap.set(b.bus_id, Math.min(0.85, 0.25 + idx * 0.12));
  });

  function broadcastWs(type: string, payload: unknown) {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        type: 'init',
        payload: {
          dataMode: DATA_MODE,
          buses: state.buses,
          notifications: state.notifications.slice(0, 10),
        },
      })
    );
  });

  // Demo Corridor Simulator: ONLY runs in DEMO mode and marks every update as simulated
  if (DATA_MODE === 'DEMO') {
    setInterval(() => {
      const updates: BusRecord[] = [];
      for (const bus of state.buses) {
        if (!bus.is_trip_active || bus.status === 'Breakdown' || bus.stops.length < 2) continue;

        let t = busProgressMap.get(bus.bus_id) ?? 0.3;
        const step = bus.status === 'Delayed' ? 0.008 : 0.014;
        t += step;
        if (t >= 0.96) t = 0.08;
        busProgressMap.set(bus.bus_id, t);

        const totalSegs = bus.stops.length - 1;
        const scaled = t * totalSegs;
        const segIdx = Math.min(totalSegs - 1, Math.floor(scaled));
        const localT = scaled - segIdx;
        const fromStop = bus.stops[segIdx];
        const toStop = bus.stops[segIdx + 1];

        bus.latitude = Number((fromStop.latitude + (toStop.latitude - fromStop.latitude) * localT).toFixed(5));
        bus.longitude = Number((fromStop.longitude + (toStop.longitude - fromStop.longitude) * localT).toFixed(5));
        bus.current_stop_index = segIdx;
        bus.current_stop_name = fromStop.name;
        bus.next_stop_name = toStop.name;

        const eta = calculateEta(bus);
        bus.distance_to_next_km = eta.distance_to_next_km;
        bus.eta_minutes = eta.estimated_eta_minutes;
        bus.is_simulated = true;
        bus.data_mode = 'DEMO';
        bus.last_updated = new Date().toISOString();
        updates.push(bus);
      }
      if (updates.length > 0 && wss.clients.size > 0) {
        broadcastWs('bus:locations', updates);
      }
    }, 3000);
  }

  function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const claims = verifyToken(token);
      if (claims) {
        const user = state.users.find((u) => u.user_id === claims.sub);
        if (user) req.authUser = user;
      }
    }
    next();
  }

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    optionalAuth(req, res, () => {
      if (!req.authUser) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      next();
    });
  }

  function requireRole(...roles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      requireAuth(req, res, () => {
        if (!req.authUser || !roles.includes(req.authUser.role)) {
          res.status(403).json({ error: 'Insufficient role permissions' });
          return;
        }
        next();
      });
    };
  }

  // Health & Config
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      data_mode: DATA_MODE,
      admin_claimed: state.admin_claimed,
      server_time: new Date().toISOString(),
    });
  });

  // Auth Routes
  app.post('/api/auth/register', (req, res) => {
    const { name, email, phone, password, role } = req.body ?? {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || password.length < 6) {
      res.status(400).json({ error: 'Valid email and password (min 6 chars) are required.' });
      return;
    }
    if (state.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const requestedRole: UserRole = role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
    const newUser: StoredUser = {
      user_id: `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name: name.trim(),
      email: cleanEmail,
      phone: typeof phone === 'string' && phone.trim() ? phone.trim() : '+91 90000 00000',
      role: requestedRole,
      favorite_buses: [],
      favorite_stops: ['Salem New Bus Stand'],
      saved_routes: ['Salem → Erode'],
      preferred_language: 'en',
      offline_auto_sync: true,
      password_hash: hashPassword(password),
    };
    state.users.push(newUser);
    saveState(state);

    const token = signToken({
      sub: newUser.user_id,
      role: newUser.role,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const token = signToken({
      sub: user.user_id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.json({ token, user: sanitizeUser(user) });
  });

  // First-run Admin password claim (or override via process.env.ADMIN_PASSCODE)
  app.post('/api/auth/claim-admin', (req, res) => {
    const { password } = req.body ?? {};
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Admin password must be at least 6 characters.' });
      return;
    }
    const adminUser = state.users.find((u) => u.role === 'ADMIN');
    if (!adminUser) {
      res.status(404).json({ error: 'Admin account record not found.' });
      return;
    }
    if (state.admin_claimed && adminUser.password_hash) {
      res.status(403).json({ error: 'Admin credentials have already been claimed.' });
      return;
    }
    adminUser.password_hash = hashPassword(password);
    state.admin_claimed = true;
    saveState(state);
    const token = signToken({
      sub: adminUser.user_id,
      role: adminUser.role,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.json({ token, user: sanitizeUser(adminUser) });
  });

  // Explicit Demo Mode role switcher (only enabled when DATA_MODE === 'DEMO')
  app.post('/api/auth/demo-session', (req, res) => {
    if (DATA_MODE !== 'DEMO') {
      res.status(403).json({ error: 'Demo sessions are disabled in LIVE mode.' });
      return;
    }
    const { role } = req.body ?? {};
    const targetRole: UserRole =
      role === 'ADMIN' ? 'ADMIN' : role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';
    const user = state.users.find((u) => u.role === targetRole) || state.users[0];
    const token = signToken({
      sub: user.user_id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });
    res.json({ token, user: sanitizeUser(user), data_mode: DATA_MODE });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    res.json({
      message: 'If an account matches this email, password reset instructions are queued (Demo Mode).',
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: sanitizeUser(req.authUser!) });
  });

  // Buses, Routes, Stops, Schedules
  app.get('/api/buses', (req, res) => {
    const { q, origin, destination, busType } = req.query;
    let result = [...state.buses];
    if (typeof origin === 'string' && origin.trim() && origin !== 'All') {
      const o = origin.trim().toLowerCase();
      result = result.filter((b) => b.origin.toLowerCase().includes(o));
    }
    if (typeof destination === 'string' && destination.trim() && destination !== 'All') {
      const d = destination.trim().toLowerCase();
      result = result.filter((b) => b.destination.toLowerCase().includes(d));
    }
    if (typeof busType === 'string' && busType.trim() && busType !== 'All') {
      result = result.filter((b) => b.bus_type === busType);
    }
    if (typeof q === 'string' && q.trim()) {
      const needle = q.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.bus_number.toLowerCase().includes(needle) ||
          b.origin.toLowerCase().includes(needle) ||
          b.destination.toLowerCase().includes(needle) ||
          b.bus_operator.toLowerCase().includes(needle) ||
          b.stops.some((s) => s.name.toLowerCase().includes(needle))
      );
    }
    res.json({ data_mode: DATA_MODE, buses: result });
  });

  app.get('/api/buses/:id', (req, res) => {
    const bus = state.buses.find(
      (b) => b.bus_id === req.params.id || b.bus_number === req.params.id
    );
    if (!bus) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    res.json({ bus, eta: calculateEta(bus) });
  });

  app.get('/api/routes', (_req, res) => {
    res.json({ data_mode: DATA_MODE, routes: state.routes });
  });

  app.get('/api/stops', (_req, res) => {
    res.json({ stops: state.stops });
  });

  app.get('/api/schedules', (_req, res) => {
    res.json({ data_mode: DATA_MODE, schedules: buildSchedulesFromBuses(state.buses) });
  });

  app.get('/api/tracking', (_req, res) => {
    res.json({
      data_mode: DATA_MODE,
      buses: state.buses.map((b) => ({
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        latitude: b.latitude,
        longitude: b.longitude,
        status: b.status,
        validity_state: b.validity_state,
        current_stop_name: b.current_stop_name,
        next_stop_name: b.next_stop_name,
        eta_minutes: b.eta_minutes,
        distance_to_next_km: b.distance_to_next_km,
        is_simulated: b.is_simulated,
        is_trip_active: b.is_trip_active,
        last_updated: b.last_updated,
      })),
    });
  });

  app.get('/api/eta/:busId', (req, res) => {
    const bus = state.buses.find(
      (b) => b.bus_id === req.params.busId || b.bus_number === req.params.busId
    );
    if (!bus) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    res.json(calculateEta(bus));
  });

  // Tickets & Booking
  app.get('/api/tickets', optionalAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser?.user_id || 'USR-PSG-01';
    const tickets =
      req.authUser?.role === 'ADMIN'
        ? state.tickets
        : state.tickets.filter((t) => t.user_id === userId || t.user_id === 'USR-PSG-01');
    res.json({ tickets });
  });

  app.post('/api/tickets', optionalAuth, (req: AuthenticatedRequest, res) => {
    const {
      bus_id,
      origin,
      destination,
      travel_date,
      departure_time,
      passenger_name,
      passenger_age,
      passenger_gender,
      passenger_phone,
      payment_method,
    } = req.body ?? {};

    const bus = state.buses.find((b) => b.bus_id === bus_id || b.bus_number === bus_id);
    if (!bus) {
      res.status(404).json({ error: 'Selected bus not found.' });
      return;
    }
    if (
      typeof passenger_name !== 'string' ||
      !passenger_name.trim() ||
      typeof passenger_phone !== 'string' ||
      passenger_phone.trim().length < 7
    ) {
      res.status(400).json({ error: 'Valid passenger name and phone number are required.' });
      return;
    }

    const randomDigits = crypto.randomInt(100000, 999999);
    const ticketId = `WMB${randomDigits}`;
    const seatNum = `${crypto.randomInt(1, 36)}${['A', 'B', 'C', 'D'][crypto.randomInt(0, 4)]}`;
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${ticketId}:${bus.bus_number}:${travel_date}`)
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();

    const newTicket: TicketRecord = {
      ticket_id: ticketId,
      user_id: req.authUser?.user_id || 'USR-PSG-01',
      bus_id: bus.bus_id,
      bus_number: bus.bus_number,
      route_name: `${origin || bus.origin} → ${destination || bus.destination}`,
      origin: String(origin || bus.origin),
      destination: String(destination || bus.destination),
      travel_date: String(travel_date || new Date().toISOString().slice(0, 10)),
      departure_time: String(departure_time || bus.departure_time),
      passenger_name: passenger_name.trim(),
      passenger_age: Math.max(1, Math.min(110, Number(passenger_age) || 25)),
      passenger_gender:
        passenger_gender === 'Female' || passenger_gender === 'Other' ? passenger_gender : 'Male',
      passenger_phone: passenger_phone.trim(),
      seat_number: seatNum,
      fare: bus.fare,
      payment_method:
        payment_method === 'Card' || payment_method === 'Net Banking' ? payment_method : 'UPI',
      payment_mode: 'Demo Payment',
      status: 'Upcoming',
      qr_token: `BUSPULSE:${ticketId}:${bus.bus_number}:${signature}`,
      created_at: new Date().toISOString(),
    };

    if (bus.available_seats > 0) {
      bus.available_seats -= 1;
    }
    state.tickets.unshift(newTicket);

    const notif: AppNotification = {
      notification_id: `NTF-${crypto.randomInt(1000, 9999)}`,
      type: 'BOOKING',
      title: 'Ticket confirmed',
      message: `Ticket ${newTicket.ticket_id} booked for ${newTicket.bus_number} (${newTicket.route_name}) on ${newTicket.travel_date}.`,
      bus_number: newTicket.bus_number,
      created_at: new Date().toISOString(),
      read: false,
      is_demo: DATA_MODE === 'DEMO',
    };
    state.notifications.unshift(notif);
    saveState(state);
    broadcastWs('notification:new', notif);

    res.status(201).json({ ticket: newTicket, notification: notif });
  });

  app.patch('/api/tickets/:id/cancel', optionalAuth, (req: AuthenticatedRequest, res) => {
    const ticket = state.tickets.find((t) => t.ticket_id === req.params.id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    ticket.status = 'Cancelled';
    const bus = state.buses.find((b) => b.bus_id === ticket.bus_id);
    if (bus && bus.available_seats < bus.total_seats) {
      bus.available_seats += 1;
    }

    const notif: AppNotification = {
      notification_id: `NTF-${crypto.randomInt(1000, 9999)}`,
      type: 'CANCELLED',
      title: 'Ticket cancelled',
      message: `Ticket ${ticket.ticket_id} (${ticket.bus_number}) has been cancelled.`,
      bus_number: ticket.bus_number,
      created_at: new Date().toISOString(),
      read: false,
      is_demo: DATA_MODE === 'DEMO',
    };
    state.notifications.unshift(notif);
    saveState(state);
    broadcastWs('notification:new', notif);

    res.json({ ticket, notification: notif });
  });

  // Notifications
  app.get('/api/notifications', (_req, res) => {
    res.json({ notifications: state.notifications });
  });

  app.post('/api/notifications/read-all', (_req, res) => {
    state.notifications.forEach((n) => {
      n.read = true;
    });
    saveState(state);
    res.json({ ok: true });
  });

  app.post('/api/notifications/reminder', (req, res) => {
    const { bus_number, next_stop } = req.body ?? {};
    const notif: AppNotification = {
      notification_id: `NTF-${crypto.randomInt(1000, 9999)}`,
      type: 'ARRIVING',
      title: 'Stop reminder active',
      message: `We will alert you before ${bus_number || 'DEMO-101'} reaches ${next_stop || 'your stop'}.`,
      bus_number: String(bus_number || 'DEMO-101'),
      created_at: new Date().toISOString(),
      read: false,
      is_demo: DATA_MODE === 'DEMO',
    };
    state.notifications.unshift(notif);
    saveState(state);
    broadcastWs('notification:new', notif);
    res.status(201).json({ notification: notif });
  });

  // User Profile & Preferences
  app.get('/api/users/profile', optionalAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser || state.users[0];
    res.json({ user: sanitizeUser(user) });
  });

  app.put('/api/users/profile', optionalAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser || state.users[0];
    const {
      name,
      phone,
      favorite_buses,
      favorite_stops,
      saved_routes,
      preferred_language,
      offline_auto_sync,
    } = req.body ?? {};

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof phone === 'string' && phone.trim()) user.phone = phone.trim();
    if (Array.isArray(favorite_buses)) user.favorite_buses = favorite_buses.map(String);
    if (Array.isArray(favorite_stops)) user.favorite_stops = favorite_stops.map(String);
    if (Array.isArray(saved_routes)) user.saved_routes = saved_routes.map(String);
    if (preferred_language === 'en' || preferred_language === 'ta' || preferred_language === 'hi') {
      user.preferred_language = preferred_language;
    }
    if (typeof offline_auto_sync === 'boolean') user.offline_auto_sync = offline_auto_sync;

    saveState(state);
    res.json({ user: sanitizeUser(user) });
  });

  // Driver Dashboard Endpoints
  app.post('/api/driver/trip/start', requireRole('DRIVER', 'ADMIN'), (req, res) => {
    const { bus_id, simulated } = req.body ?? {};
    const bus = state.buses.find((b) => b.bus_id === bus_id || b.bus_number === bus_id);
    if (!bus) {
      res.status(404).json({ error: 'Assigned bus not found' });
      return;
    }
    bus.is_trip_active = true;
    bus.status = 'On Time';
    bus.validity_state = 'LIVE';
    bus.delay_minutes = 0;
    bus.is_simulated = Boolean(simulated ?? DATA_MODE === 'DEMO');
    bus.last_updated = new Date().toISOString();
    saveState(state);
    broadcastWs('bus:locations', [bus]);
    res.json({ bus });
  });

  app.post('/api/driver/trip/end', requireRole('DRIVER', 'ADMIN'), (req, res) => {
    const { bus_id } = req.body ?? {};
    const bus = state.buses.find((b) => b.bus_id === bus_id || b.bus_number === bus_id);
    if (!bus) {
      res.status(404).json({ error: 'Assigned bus not found' });
      return;
    }
    bus.is_trip_active = false;
    bus.status = 'Completed';
    bus.validity_state = 'OFFLINE';
    bus.last_updated = new Date().toISOString();
    saveState(state);
    broadcastWs('bus:locations', [bus]);
    res.json({ bus });
  });

  app.post('/api/tracking/update', requireRole('DRIVER', 'ADMIN'), (req, res) => {
    const { bus_id, latitude, longitude, speed_kmh, is_simulated } = req.body ?? {};
    const bus = state.buses.find((b) => b.bus_id === bus_id || b.bus_number === bus_id);
    if (!bus) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      bus.latitude = latitude;
      bus.longitude = longitude;
    }
    if (typeof speed_kmh === 'number') {
      bus.speed_kmh = Math.max(0, Math.min(110, speed_kmh));
    }
    bus.is_trip_active = true;
    bus.is_simulated = typeof is_simulated === 'boolean' ? is_simulated : DATA_MODE === 'DEMO';
    const eta = calculateEta(bus);
    bus.distance_to_next_km = eta.distance_to_next_km;
    bus.eta_minutes = eta.estimated_eta_minutes;
    bus.last_updated = new Date().toISOString();
    saveState(state);
    broadcastWs('bus:locations', [bus]);
    res.json({ bus, eta });
  });

  app.post('/api/driver/incident', requireRole('DRIVER', 'ADMIN'), (req, res) => {
    const { bus_id, type, delay_minutes, note } = req.body ?? {};
    const bus = state.buses.find((b) => b.bus_id === bus_id || b.bus_number === bus_id);
    if (!bus) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }

    let notifTitle = 'Bus advisory';
    let notifType: AppNotification['type'] = 'DELAY';
    if (type === 'DELAY') {
      bus.status = 'Delayed';
      bus.validity_state = 'DELAYED';
      bus.delay_minutes = Math.max(5, Number(delay_minutes) || 15);
      notifTitle = `${bus.bus_number} delayed by ${bus.delay_minutes} min`;
      notifType = 'DELAY';
    } else if (type === 'BREAKDOWN') {
      bus.status = 'Breakdown';
      bus.validity_state = 'DELAYED';
      bus.is_trip_active = false;
      notifTitle = `${bus.bus_number} reported a mechanical breakdown`;
      notifType = 'EMERGENCY';
    } else if (type === 'EMERGENCY') {
      notifTitle = `Emergency alert from ${bus.bus_number}`;
      notifType = 'EMERGENCY';
    } else if (type === 'CLEAR') {
      bus.status = 'On Time';
      bus.validity_state = bus.is_trip_active ? 'LIVE' : 'OFFLINE';
      bus.delay_minutes = 0;
      notifTitle = `${bus.bus_number} back on schedule`;
      notifType = 'ROUTE_CHANGE';
    }

    bus.last_updated = new Date().toISOString();
    const notif: AppNotification = {
      notification_id: `NTF-${crypto.randomInt(1000, 9999)}`,
      type: notifType,
      title: notifTitle,
      message:
        typeof note === 'string' && note.trim()
          ? note.trim()
          : `${bus.bus_number} (${bus.origin} → ${bus.destination}) status updated to ${bus.status}.`,
      bus_number: bus.bus_number,
      created_at: new Date().toISOString(),
      read: false,
      is_demo: DATA_MODE === 'DEMO',
    };
    state.notifications.unshift(notif);
    saveState(state);
    broadcastWs('bus:locations', [bus]);
    broadcastWs('notification:new', notif);

    res.json({ bus, notification: notif });
  });

  // Admin Dashboard Endpoints
  app.get('/api/admin/overview', requireRole('ADMIN'), (_req, res) => {
    const activeBuses = state.buses.filter((b) => b.is_trip_active).length;
    const delayedBuses = state.buses.filter((b) => b.status === 'Delayed' || b.status === 'Breakdown').length;
    const offlineBuses = state.buses.filter((b) => b.validity_state === 'OFFLINE').length;
    const todayBookings = state.tickets.filter((t) => t.status !== 'Cancelled').length;

    res.json({
      kpis: {
        total_buses: state.buses.length,
        active_buses: activeBuses,
        todays_bookings: todayBookings + 214,
        registered_users: state.users.length + 1280,
        delayed_buses: delayedBuses,
        offline_devices: offlineBuses + 18,
      },
      charts: {
        daily_bookings: state.daily_bookings_series,
        bus_activity: [
          { label: 'On Time', count: state.buses.filter((b) => b.status === 'On Time').length },
          { label: 'Delayed', count: state.buses.filter((b) => b.status === 'Delayed').length },
          { label: 'Scheduled', count: state.buses.filter((b) => b.status === 'Scheduled').length },
          { label: 'Completed/Other', count: state.buses.filter((b) => b.status === 'Completed' || b.status === 'Breakdown').length },
        ],
        popular_routes: [
          { route: 'Salem → Erode Express', share: 54 },
          { route: 'Salem → Sankari → Erode', share: 28 },
          { route: 'Erode → Salem Return', share: 18 },
        ],
      },
      users: state.users.map(sanitizeUser),
      tickets: state.tickets,
    });
  });

  app.post('/api/buses', requireRole('ADMIN'), (req, res) => {
    const { bus_number, bus_operator, bus_type, origin, destination, departure_time, arrival_time, fare } =
      req.body ?? {};
    if (typeof bus_number !== 'string' || !bus_number.trim()) {
      res.status(400).json({ error: 'Bus number is required' });
      return;
    }
    const route = state.routes[0];
    const newBus: BusRecord = {
      bus_id: `BUS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      bus_number: bus_number.trim().toUpperCase(),
      bus_operator: String(bus_operator || 'Salem–Erode Demo Fleet'),
      bus_type: bus_type || 'Express',
      route_id: route.route_id,
      origin: String(origin || 'Salem'),
      destination: String(destination || 'Erode'),
      stops: route.stops,
      departure_time: String(departure_time || '06:00 PM'),
      arrival_time: String(arrival_time || '08:00 PM'),
      duration: '2h 00m',
      duration_minutes: 120,
      fare: Math.max(20, Number(fare) || 100),
      operating_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      available_seats: 44,
      total_seats: 44,
      status: 'Scheduled',
      validity_state: 'OFFLINE',
      delay_minutes: 0,
      latitude: route.stops[0].latitude,
      longitude: route.stops[0].longitude,
      speed_kmh: 45,
      heading_deg: 245,
      current_stop_index: 0,
      current_stop_name: route.stops[0].name,
      next_stop_name: route.stops[1].name,
      distance_to_next_km: 12.0,
      eta_minutes: 16,
      is_trip_active: false,
      is_simulated: DATA_MODE === 'DEMO',
      data_mode: DATA_MODE,
      last_updated: new Date().toISOString(),
    };
    state.buses.push(newBus);
    saveState(state);
    broadcastWs('bus:locations', [newBus]);
    res.status(201).json({ bus: newBus });
  });

  app.put('/api/buses/:id', requireRole('ADMIN'), (req, res) => {
    const bus = state.buses.find((b) => b.bus_id === req.params.id);
    if (!bus) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    const { fare, departure_time, arrival_time, status } = req.body ?? {};
    if (typeof fare === 'number') bus.fare = Math.max(10, fare);
    if (typeof departure_time === 'string') bus.departure_time = departure_time;
    if (typeof arrival_time === 'string') bus.arrival_time = arrival_time;
    if (status === 'On Time' || status === 'Delayed' || status === 'Scheduled') {
      bus.status = status;
      bus.validity_state = status === 'Delayed' ? 'DELAYED' : bus.is_trip_active ? 'LIVE' : 'OFFLINE';
    }
    bus.last_updated = new Date().toISOString();
    saveState(state);
    broadcastWs('bus:locations', [bus]);
    res.json({ bus });
  });

  app.delete('/api/buses/:id', requireRole('ADMIN'), (req, res) => {
    const idx = state.buses.findIndex((b) => b.bus_id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    state.buses.splice(idx, 1);
    saveState(state);
    res.json({ ok: true });
  });

  app.post('/api/notifications/broadcast', requireRole('ADMIN'), (req, res) => {
    const { title, message, bus_number } = req.body ?? {};
    if (typeof title !== 'string' || typeof message !== 'string') {
      res.status(400).json({ error: 'Title and message are required' });
      return;
    }
    const notif: AppNotification = {
      notification_id: `NTF-${crypto.randomInt(1000, 9999)}`,
      type: 'ROUTE_CHANGE',
      title: title.trim(),
      message: message.trim(),
      bus_number: typeof bus_number === 'string' && bus_number.trim() ? bus_number.trim() : undefined,
      created_at: new Date().toISOString(),
      read: false,
      is_demo: DATA_MODE === 'DEMO',
    };
    state.notifications.unshift(notif);
    saveState(state);
    broadcastWs('notification:new', notif);
    res.status(201).json({ notification: notif });
  });

  // Frontend Vite / Static Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BUSPulse server running on http://0.0.0.0:${PORT} [DATA_MODE=${DATA_MODE}]`);
  });
}

startServer();
