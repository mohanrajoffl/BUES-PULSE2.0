import { Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { AuthUser, TicketRecord } from '../types/transit.ts';

interface AdminOverviewResponse {
  kpis: {
    total_buses: number;
    active_buses: number;
    todays_bookings: number;
    registered_users: number;
    delayed_buses: number;
    offline_devices: number;
  };
  charts: {
    daily_bookings: { day: string; bookings: number; revenue: number }[];
    bus_activity: { label: string; count: number }[];
    popular_routes: { route: string; share: number }[];
  };
  users: AuthUser[];
  tickets: TicketRecord[];
}

export const AdminDashboardPage: React.FC = () => {
  const { t } = useI18n();
  const { buses, user, token, dataMode, apiFetch, loginDemoRole, syncAll } = useTransitStore();
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'buses' | 'tickets' | 'users' | 'broadcast'>('buses');
  const [newBusNumber, setNewBusNumber] = useState('DEMO-107');
  const [newBusFare, setNewBusFare] = useState('120');
  const [newBusDep, setNewBusDep] = useState('06:15 PM');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const isAdmin = token && user?.role === 'ADMIN';

  const loadOverview = async () => {
    if (!isAdmin) return;
    try {
      const data = await apiFetch<AdminOverviewResponse>('/api/admin/overview');
      setOverview(data);
    } catch {
      // handled cleanly
    }
  };

  useEffect(() => {
    loadOverview();
  }, [isAdmin, buses.length]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4">
        <ShieldCheck className="w-10 h-10 text-emerald-700 mx-auto" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">{t('admin.title')}</h1>
        <p className="text-sm text-slate-600">
          Admin authorization is required to manage fleet schedules, fares, and analytics.
        </p>
        {dataMode === 'DEMO' && (
          <button
            type="button"
            onClick={() => loginDemoRole('ADMIN')}
            className="w-full rounded-xl bg-emerald-800 py-3 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
          >
            Sign In as Demo Admin
          </button>
        )}
      </div>
    );
  }

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/buses', {
        method: 'POST',
        body: JSON.stringify({
          bus_number: newBusNumber,
          bus_operator: 'Salem–Erode Demo Fleet',
          bus_type: 'Express',
          origin: 'Salem',
          destination: 'Erode',
          departure_time: newBusDep,
          arrival_time: '08:15 PM',
          fare: Number(newBusFare) || 100,
        }),
      });
      await syncAll();
      await loadOverview();
      setFeedback(`Added bus ${newBusNumber} to Salem → Erode timetable.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to add bus.');
    }
  };

  const handleDeleteBus = async (busId: string) => {
    try {
      await apiFetch(`/api/buses/${busId}`, { method: 'DELETE' });
      await syncAll();
      await loadOverview();
      setFeedback('Bus removed from active fleet.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to delete bus.');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    try {
      await apiFetch('/api/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title: alertTitle, message: alertMessage }),
      });
      setAlertTitle('');
      setAlertMessage('');
      setFeedback('Broadcast alert delivered via WebSocket.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Broadcast failed.');
    }
  };

  const kpis = overview?.kpis;
  const maxBooking = Math.max(
    1,
    ...(overview?.charts.daily_bookings.map((d) => d.bookings) || [1])
  );

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('admin.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('admin.subtitle')}</p>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-950">
          {feedback}
        </div>
      )}

      {/* 6 KPI Cards */}
      {kpis && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: t('admin.totalBuses'), value: kpis.total_buses },
            { label: t('admin.activeBuses'), value: kpis.active_buses },
            { label: t('admin.todaysBookings'), value: kpis.todays_bookings },
            { label: t('admin.registeredUsers'), value: kpis.registered_users },
            { label: t('admin.delayedBuses'), value: kpis.delayed_buses },
            { label: t('admin.offlineDevices'), value: kpis.offline_devices },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {card.value}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Charts Grid */}
      {overview && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">Daily Bookings (Demo Corridor)</h2>
            <div className="mt-6 grid grid-cols-7 gap-3 items-end h-44">
              {overview.charts.daily_bookings.map((item) => {
                const heightPct = Math.round((item.bookings / maxBooking) * 100);
                return (
                  <div key={item.day} className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
                      {item.bookings}
                    </span>
                    <div
                      className="w-full max-w-[36px] rounded-t-lg bg-emerald-700"
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                    />
                    <span className="text-xs font-medium text-slate-600">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Popular Routes</h2>
              <div className="mt-3 space-y-3">
                {overview.charts.popular_routes.map((r) => (
                  <div key={r.route} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-800">{r.route}</span>
                      <span className="font-mono font-semibold text-slate-600 tabular-nums">
                        {r.share}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 rounded-full"
                        style={{ width: `${r.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Bus Activity</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {overview.charts.bus_activity.map((b) => (
                  <div key={b.label} className="flex justify-between py-1">
                    <span className="text-slate-600">{b.label}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Management Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
        {([
          { id: 'buses', label: 'Manage Buses' },
          { id: 'tickets', label: 'Tickets' },
          { id: 'users', label: 'Users' },
          { id: 'broadcast', label: 'Broadcast Alert' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'buses' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddBus}
            className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bus Number</label>
              <input
                type="text"
                value={newBusNumber}
                onChange={(e) => setNewBusNumber(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Departure</label>
              <input
                type="text"
                value={newBusDep}
                onChange={(e) => setNewBusDep(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fare (₹)</label>
              <input
                type="number"
                value={newBusFare}
                onChange={(e) => setNewBusFare(e.target.value)}
                className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[40px]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Bus</span>
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">BUS</th>
                    <th className="py-3 px-4">CORRIDOR</th>
                    <th className="py-3 px-4">DEPARTURE</th>
                    <th className="py-3 px-4 text-right">FARE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">REMOVE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {buses.map((b) => (
                    <tr key={b.bus_id}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.bus_number}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {b.origin} → {b.destination}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {b.departure_time}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        ₹{b.fare}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">{b.status}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteBus(b.bus_id)}
                          aria-label={`Delete ${b.bus_number}`}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && overview && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">TICKET ID</th>
                  <th className="py-3 px-4">BUS</th>
                  <th className="py-3 px-4">PASSENGER</th>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4 text-right">FARE</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.tickets.map((tk) => (
                  <tr key={tk.ticket_id}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{tk.ticket_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{tk.bus_number}</td>
                    <td className="py-3 px-4 text-slate-800">{tk.passenger_name}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">{tk.travel_date}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">₹{tk.fare}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">{tk.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && overview && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">EMAIL</th>
                  <th className="py-3 px-4">PHONE</th>
                  <th className="py-3 px-4">ROLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-700">{u.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.phone}</td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-emerald-800">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <form
          onSubmit={handleBroadcast}
          className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">Broadcast Passenger Notification</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alert Title</label>
            <input
              type="text"
              required
              value={alertTitle}
              onChange={(e) => setAlertTitle(e.target.value)}
              placeholder="e.g., Additional evening bus added"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Message</label>
            <textarea
              required
              rows={3}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="e.g., Extra Salem → Erode express departs at 06:15 PM."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[42px]"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Send Broadcast</span>
          </button>
        </form>
      )}
    </div>
  );
};
