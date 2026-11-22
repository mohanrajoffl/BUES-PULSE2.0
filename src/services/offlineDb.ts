import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  AppNotification,
  BusRecord,
  BusStop,
  RouteDefinition,
  ScheduleItem,
  TicketRecord,
} from '../types/transit.ts';

interface BusPulseSchema extends DBSchema {
  buses: { key: string; value: BusRecord };
  routes: { key: string; value: RouteDefinition };
  stops: { key: string; value: BusStop };
  schedules: { key: string; value: ScheduleItem };
  tickets: { key: string; value: TicketRecord };
  notifications: { key: string; value: AppNotification };
  meta: { key: string; value: { key: string; value: string } };
}

const DB_NAME = 'buspulse-offline-v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BusPulseSchema>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<BusPulseSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('buses')) db.createObjectStore('buses', { keyPath: 'bus_id' });
        if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', { keyPath: 'route_id' });
        if (!db.objectStoreNames.contains('stops')) db.createObjectStore('stops', { keyPath: 'stop_id' });
        if (!db.objectStoreNames.contains('schedules')) db.createObjectStore('schedules', { keyPath: 'schedule_id' });
        if (!db.objectStoreNames.contains('tickets')) db.createObjectStore('tickets', { keyPath: 'ticket_id' });
        if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'notification_id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

export async function syncSnapshotToIndexedDB(payload: {
  buses?: BusRecord[];
  routes?: RouteDefinition[];
  stops?: BusStop[];
  schedules?: ScheduleItem[];
  tickets?: TicketRecord[];
  notifications?: AppNotification[];
}): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();

  if (payload.buses) {
    const tx = db.transaction('buses', 'readwrite');
    await tx.store.clear();
    for (const item of payload.buses) await tx.store.put(item);
    await tx.done;
  }
  if (payload.routes) {
    const tx = db.transaction('routes', 'readwrite');
    await tx.store.clear();
    for (const item of payload.routes) await tx.store.put(item);
    await tx.done;
  }
  if (payload.stops) {
    const tx = db.transaction('stops', 'readwrite');
    await tx.store.clear();
    for (const item of payload.stops) await tx.store.put(item);
    await tx.done;
  }
  if (payload.schedules) {
    const tx = db.transaction('schedules', 'readwrite');
    await tx.store.clear();
    for (const item of payload.schedules) await tx.store.put(item);
    await tx.done;
  }
  if (payload.tickets) {
    const tx = db.transaction('tickets', 'readwrite');
    await tx.store.clear();
    for (const item of payload.tickets) await tx.store.put(item);
    await tx.done;
  }
  if (payload.notifications) {
    const tx = db.transaction('notifications', 'readwrite');
    await tx.store.clear();
    for (const item of payload.notifications) await tx.store.put(item);
    await tx.done;
  }

  await db.put('meta', { key: 'lastSyncedAt', value: now });
  return now;
}

export async function loadSnapshotFromIndexedDB(): Promise<{
  buses: BusRecord[];
  routes: RouteDefinition[];
  stops: BusStop[];
  schedules: ScheduleItem[];
  tickets: TicketRecord[];
  notifications: AppNotification[];
  lastSyncedAt: string | null;
}> {
  const db = await getDb();
  const [buses, routes, stops, schedules, tickets, notifications, meta] = await Promise.all([
    db.getAll('buses'),
    db.getAll('routes'),
    db.getAll('stops'),
    db.getAll('schedules'),
    db.getAll('tickets'),
    db.getAll('notifications'),
    db.get('meta', 'lastSyncedAt'),
  ]);
  return {
    buses,
    routes,
    stops,
    schedules,
    tickets,
    notifications,
    lastSyncedAt: meta?.value ?? null,
  };
}

export async function clearOfflineCache(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear('buses'),
    db.clear('routes'),
    db.clear('stops'),
    db.clear('schedules'),
    db.clear('tickets'),
    db.clear('notifications'),
    db.clear('meta'),
  ]);
}
