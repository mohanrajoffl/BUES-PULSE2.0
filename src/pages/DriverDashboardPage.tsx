import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Play,
  Radio,
  Square,
  Truck,
} from 'lucide-react';
import React, { useState } from 'react';
import { BusStatus } from '../components/BusStatus.tsx';
import { RouteTimeline } from '../components/RouteTimeline.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';

export const DriverDashboardPage: React.FC = () => {
  const { t } = useI18n();
  const { buses, user, token, dataMode, isOnline, apiFetch, loginDemoRole, syncAll } =
    useTransitStore();
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.bus_id || 'BUS-DEMO-101');
  const [demoSimMode, setDemoSimMode] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isDriverAuthorized = token && (user?.role === 'DRIVER' || user?.role === 'ADMIN');
  const bus = buses.find((b) => b.bus_id === selectedBusId) || buses[0];

  if (!isDriverAuthorized) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4">
        <Truck className="w-10 h-10 text-amber-600 mx-auto" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">{t('driver.title')}</h1>
        <p className="text-sm text-slate-600">
          Driver authentication is required to manage active trips and publish GPS telemetry.
        </p>
        {dataMode === 'DEMO' && (
          <button
            type="button"
            onClick={() => loginDemoRole('DRIVER')}
            className="w-full rounded-xl bg-emerald-800 py-3 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
          >
            Sign In as Demo Driver (Karthik S.)
          </button>
        )}
      </div>
    );
  }

  const handleStartTrip = async () => {
    if (!bus) return;
    setBusy(true);
    try {
      await apiFetch('/api/driver/trip/start', {
        method: 'POST',
        body: JSON.stringify({ bus_id: bus.bus_id, simulated: demoSimMode }),
      });
      await syncAll();
      setStatusFeedback(
        `Trip started for ${bus.bus_number} (${demoSimMode ? 'Demo Simulation Mode' : 'Live GPS'}).`
      );
    } catch (err) {
      setStatusFeedback(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEndTrip = async () => {
    if (!bus) return;
    setBusy(true);
    try {
      await apiFetch('/api/driver/trip/end', {
        method: 'POST',
        body: JSON.stringify({ bus_id: bus.bus_id }),
      });
      await syncAll();
      setStatusFeedback(`Trip ended for ${bus.bus_number}.`);
    } catch (err) {
      setStatusFeedback(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendGpsPulse = async () => {
    if (!bus) return;
    setBusy(true);

    const sendCoords = async (lat: number, lng: number, isSim: boolean) => {
      await apiFetch('/api/tracking/update', {
        method: 'POST',
        body: JSON.stringify({
          bus_id: bus.bus_id,
          latitude: lat,
          longitude: lng,
          speed_kmh: 46,
          is_simulated: isSim,
        }),
      });
      await syncAll();
      setStatusFeedback(
        `GPS pulse transmitted (${lat.toFixed(4)}, ${lng.toFixed(4)}) · ${
          isSim ? 'Demo Simulation Mode' : 'Device GPS'
        }.`
      );
      setBusy(false);
    };

    if (!demoSimMode && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendCoords(pos.coords.latitude, pos.coords.longitude, false),
        () => sendCoords(bus.latitude, bus.longitude, true),
        { timeout: 5000 }
      );
    } else {
      const nextStop = bus.stops[Math.min(bus.current_stop_index + 1, bus.stops.length - 1)];
      const nextLat = Number(((bus.latitude + nextStop.latitude) / 2).toFixed(5));
      const nextLng = Number(((bus.longitude + nextStop.longitude) / 2).toFixed(5));
      await sendCoords(nextLat, nextLng, true);
    }
  };

  const handleIncident = async (type: 'DELAY' | 'BREAKDOWN' | 'EMERGENCY' | 'CLEAR') => {
    if (!bus) return;
    setBusy(true);
    try {
      await apiFetch('/api/driver/incident', {
        method: 'POST',
        body: JSON.stringify({
          bus_id: bus.bus_id,
          type,
          delay_minutes: 15,
          note: note.trim() || undefined,
        }),
      });
      await syncAll();
      setStatusFeedback(`Alert "${type}" broadcasted to passengers and admin.`);
      setNote('');
    } catch (err) {
      setStatusFeedback(err instanceof Error ? err.message : 'Failed to send alert.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('driver.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('driver.subtitle')}</p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={demoSimMode}
            onChange={(e) => setDemoSimMode(e.target.checked)}
            className="accent-emerald-700"
          />
          <span>{t('driver.demoSimMode')}</span>
        </label>
      </div>

      {statusFeedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-950">
          {statusFeedback}
        </div>
      )}

      {bus && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {t('driver.assignedBus')}
                  </label>
                  <select
                    value={bus.bus_id}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-sm font-bold text-slate-900"
                  >
                    {buses.map((b) => (
                      <option key={b.bus_id} value={b.bus_id}>
                        {b.bus_number} · {b.origin} → {b.destination} ({b.departure_time})
                      </option>
                    ))}
                  </select>
                </div>

                <BusStatus
                  validity={bus.validity_state}
                  isOnline={isOnline}
                  isSimulated={bus.is_simulated}
                  dataMode={dataMode}
                  delayMinutes={bus.delay_minutes}
                />
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">{t('track.currentLocation')}</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{bus.current_stop_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t('track.nextStop')}</dt>
                  <dd className="mt-1 font-semibold text-slate-900 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>{bus.next_stop_name}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Coordinates</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-700 tabular-nums">
                    {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
                  </dd>
                </div>
              </dl>

              {/* Trip & GPS Controls */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStartTrip}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[42px]"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('driver.startTrip')}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSendGpsPulse}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 min-h-[42px]"
                >
                  <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('driver.shareGps')}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleEndTrip}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
                >
                  <Square className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('driver.endTrip')}</span>
                </button>
              </div>
            </section>

            {/* Incident & Emergency Controls */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Corridor Incident Reporting</h2>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g., Heavy traffic near Sankari toll plaza)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleIncident('DELAY')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 py-2.5 px-4 text-xs font-semibold text-amber-900 hover:bg-amber-100 min-h-[42px]"
                >
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span>{t('driver.reportDelay')}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleIncident('BREAKDOWN')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 py-2.5 px-4 text-xs font-semibold text-rose-900 hover:bg-rose-100 min-h-[42px]"
                >
                  <AlertOctagon className="w-4 h-4" aria-hidden="true" />
                  <span>{t('driver.reportBreakdown')}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleIncident('EMERGENCY')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 py-2.5 px-4 text-xs font-semibold text-white hover:bg-rose-800 min-h-[42px]"
                >
                  <AlertOctagon className="w-4 h-4" aria-hidden="true" />
                  <span>{t('driver.emergencyAlert')}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleIncident('CLEAR')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white py-2.5 px-4 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 min-h-[42px]"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>{t('driver.clearAlert')}</span>
                </button>
              </div>
            </section>
          </div>

          <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">{t('track.routeTimeline')}</h2>
            <RouteTimeline
              stops={bus.stops}
              currentStopIndex={bus.current_stop_index}
              isTripActive={bus.is_trip_active}
            />
          </section>
        </div>
      )}
    </div>
  );
};
