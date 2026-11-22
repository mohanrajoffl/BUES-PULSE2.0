import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  clearOfflineCache,
  loadSnapshotFromIndexedDB,
  syncSnapshotToIndexedDB,
} from '../services/offlineDb.ts';
import type {
  AppNotification,
  AuthUser,
  BusRecord,
  BusStop,
  DataMode,
  RouteDefinition,
  ScheduleItem,
  TicketRecord,
  UserRole,
} from '../types/transit.ts';
import { useI18n } from './useI18n.tsx';

interface TransitContextValue {
  buses: BusRecord[];
  routes: RouteDefinition[];
  stops: BusStop[];
  schedules: ScheduleItem[];
  tickets: TicketRecord[];
  notifications: AppNotification[];
  user: AuthUser | null;
  token: string | null;
  dataMode: DataMode;
  isOnline: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  lastSyncedAt: string | null;
  isLoading: boolean;
  wsConnected: boolean;
  toastMessage: string | null;
  clearToast: () => void;
  syncAll: (showToast?: boolean) => Promise<void>;
  clearCache: () => Promise<void>;
  apiFetch: <T>(url: string, init?: RequestInit) => Promise<T>;
  loginDemoRole: (role: UserRole) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerAccount: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'PASSENGER' | 'DRIVER';
  }) => Promise<void>;
  logout: () => void;
  refreshTickets: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateProfileLocal: (updated: AuthUser) => void;
}

const TransitContext = createContext<TransitContextValue | null>(null);

export const TransitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [routes, setRoutes] = useState<RouteDefinition[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>('DEMO');
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOfflineState] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isOnline = browserOnline && !simulatedOffline;
  const prevOnlineRef = useRef<boolean>(isOnline);
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => setToastMessage(null), []);

  const apiFetch = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers || {});
    if (!headers.has('Content-Type') && init?.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (tokenRef.current) {
      headers.set('Authorization', `Bearer ${tokenRef.current}`);
    }
    const res = await fetch(url, { ...init, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
    }
    return data as T;
  }, []);

  const syncAll = useCallback(
    async (notifyRestored = false) => {
      if (!browserOnline || simulatedOffline) {
        const cached = await loadSnapshotFromIndexedDB();
        if (cached.buses.length > 0) setBuses(cached.buses);
        if (cached.routes.length > 0) setRoutes(cached.routes);
        if (cached.stops.length > 0) setStops(cached.stops);
        if (cached.schedules.length > 0) setSchedules(cached.schedules);
        if (cached.tickets.length > 0) setTickets(cached.tickets);
        if (cached.notifications.length > 0) setNotifications(cached.notifications);
        setLastSyncedAt(cached.lastSyncedAt);
        setIsLoading(false);
        return;
      }

      try {
        const [busRes, routeRes, stopRes, schedRes, ticketRes, notifRes, profileRes] =
          await Promise.all([
            apiFetch<{ data_mode: DataMode; buses: BusRecord[] }>('/api/buses'),
            apiFetch<{ data_mode: DataMode; routes: RouteDefinition[] }>('/api/routes'),
            apiFetch<{ stops: BusStop[] }>('/api/stops'),
            apiFetch<{ schedules: ScheduleItem[] }>('/api/schedules'),
            apiFetch<{ tickets: TicketRecord[] }>('/api/tickets'),
            apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
            apiFetch<{ user: AuthUser }>('/api/users/profile'),
          ]);

        setDataMode(busRes.data_mode || 'DEMO');
        setBuses(busRes.buses);
        setRoutes(routeRes.routes);
        setStops(stopRes.stops);
        setSchedules(schedRes.schedules);
        setTickets(ticketRes.tickets);
        setNotifications(notifRes.notifications);
        if (!user) setUser(profileRes.user);

        const syncedAt = await syncSnapshotToIndexedDB({
          buses: busRes.buses,
          routes: routeRes.routes,
          stops: stopRes.stops,
          schedules: schedRes.schedules,
          tickets: ticketRes.tickets,
          notifications: notifRes.notifications,
        });
        setLastSyncedAt(syncedAt);

        if (notifyRestored) {
          showToast(t('app.connectionRestored'));
        }
      } catch {
        const cached = await loadSnapshotFromIndexedDB();
        if (cached.buses.length > 0) setBuses(cached.buses);
        if (cached.routes.length > 0) setRoutes(cached.routes);
        if (cached.stops.length > 0) setStops(cached.stops);
        if (cached.schedules.length > 0) setSchedules(cached.schedules);
        if (cached.tickets.length > 0) setTickets(cached.tickets);
        if (cached.notifications.length > 0) setNotifications(cached.notifications);
        setLastSyncedAt(cached.lastSyncedAt);
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch, browserOnline, simulatedOffline, showToast, t, user]
  );

  // Initial load: hydrate from IndexedDB immediately for instant speed, then sync with backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await loadSnapshotFromIndexedDB();
        if (mounted && cached.buses.length > 0) {
          setBuses(cached.buses);
          setRoutes(cached.routes);
          setStops(cached.stops);
          setSchedules(cached.schedules);
          setTickets(cached.tickets);
          setNotifications(cached.notifications);
          setLastSyncedAt(cached.lastSyncedAt);
          setIsLoading(false);
        }
      } catch {
        // ignore IDB init error
      }
      if (mounted) await syncAll(false);
    })();
    return () => {
      mounted = false;
    };
  }, [syncAll]);

  // Listen to browser online/offline events
  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Automatic synchronization when connectivity returns
  useEffect(() => {
    if (!prevOnlineRef.current && isOnline) {
      syncAll(true);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, syncAll]);

  // WebSocket Live Bus Telemetry & Notification Listener
  useEffect(() => {
    if (!isOnline) {
      setWsConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByEffect = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'bus:locations' && Array.isArray(msg.payload)) {
            const incoming = msg.payload as BusRecord[];
            setBuses((prev) => {
              const map = new Map(prev.map((b) => [b.bus_id, b]));
              for (const updated of incoming) {
                map.set(updated.bus_id, updated);
              }
              return Array.from(map.values());
            });
          } else if (msg.type === 'notification:new' && msg.payload) {
            const incoming = msg.payload as AppNotification;
            setNotifications((prev) => {
              if (prev.some((n) => n.notification_id === incoming.notification_id)) return prev;
              return [incoming, ...prev];
            });
            showToast(incoming.title);
          }
        } catch {
          // ignore malformed ws frame
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByEffect) {
          reconnectTimer = window.setTimeout(connect, 4000);
        }
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [isOnline, showToast]);

  const setSimulatedOffline = (val: boolean) => {
    setSimulatedOfflineState(val);
  };

  const clearCache = async () => {
    await clearOfflineCache();
    setLastSyncedAt(null);
    showToast('Offline IndexedDB cache cleared.');
  };

  const loginDemoRole = async (role: UserRole) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/demo-session', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    setToken(res.token);
    setUser(res.user);
    showToast(`Signed in as ${res.user.name} (${res.user.role})`);
  };

  const loginWithEmail = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setUser(res.user);
    showToast(`Welcome back, ${res.user.name}`);
  };

  const registerAccount = async (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'PASSENGER' | 'DRIVER';
  }) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(res.token);
    setUser(res.user);
    showToast(`Account created for ${res.user.name}`);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    showToast('Signed out');
  };

  const refreshTickets = async () => {
    if (!isOnline) return;
    const res = await apiFetch<{ tickets: TicketRecord[] }>('/api/tickets');
    setTickets(res.tickets);
    await syncSnapshotToIndexedDB({ tickets: res.tickets });
  };

  const refreshNotifications = async () => {
    if (!isOnline) return;
    const res = await apiFetch<{ notifications: AppNotification[] }>('/api/notifications');
    setNotifications(res.notifications);
  };

  const updateProfileLocal = (updated: AuthUser) => setUser(updated);

  return (
    <TransitContext.Provider
      value={{
        buses,
        routes,
        stops,
        schedules,
        tickets,
        notifications,
        user,
        token,
        dataMode,
        isOnline,
        simulatedOffline,
        setSimulatedOffline,
        lastSyncedAt,
        isLoading,
        wsConnected,
        toastMessage,
        clearToast,
        syncAll,
        clearCache,
        apiFetch,
        loginDemoRole,
        loginWithEmail,
        registerAccount,
        logout,
        refreshTickets,
        refreshNotifications,
        updateProfileLocal,
      }}
    >
      {children}
    </TransitContext.Provider>
  );
};

export function useTransitStore() {
  const ctx = useContext(TransitContext);
  if (!ctx) throw new Error('useTransitStore must be used inside TransitProvider');
  return ctx;
}
