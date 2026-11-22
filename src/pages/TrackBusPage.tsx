import { BellRing, Clock, MapPin, Navigation, Ticket } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { BusStatus } from '../components/BusStatus.tsx';
import { MapView } from '../components/MapView.tsx';
import { RouteTimeline } from '../components/RouteTimeline.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { BusRecord, EtaResponse } from '../types/transit.ts';

interface TrackBusPageProps {
  selectedBusId: string | null;
  onSelectBus: (bus: BusRecord) => void;
  onBookBus: (bus: BusRecord) => void;
}

export const TrackBusPage: React.FC<TrackBusPageProps> = ({
  selectedBusId,
  onSelectBus,
  onBookBus,
}) => {
  const { t } = useI18n();
  const { buses, routes, stops, dataMode, isOnline, apiFetch, refreshNotifications } =
    useTransitStore();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [etaDetail, setEtaDetail] = useState<EtaResponse | null>(null);
  const [reminderSaved, setReminderSaved] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const selectedBus =
    buses.find((b) => b.bus_id === selectedBusId || b.bus_number === selectedBusId) ||
    buses[0] ||
    null;

  const activeRoute =
    routes.find((r) => r.route_id === selectedBus?.route_id) || routes[0] || null;

  useEffect(() => {
    if (!selectedBus || !isOnline) {
      setEtaDetail(null);
      return;
    }
    let active = true;
    apiFetch<EtaResponse>(`/api/eta/${selectedBus.bus_id}`)
      .then((res) => {
        if (active) setEtaDetail(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedBus?.bus_id, selectedBus?.last_updated, isOnline, apiFetch]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 11.6643, lng: 78.146 });
      setLocationNotice('Geolocation unsupported — centered near Salem New Bus Stand.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationNotice(null);
      },
      () => {
        setUserLocation({ lat: 11.6643, lng: 78.146 });
        setLocationNotice('Location permission declined — using Salem New Bus Stand reference.');
      },
      { timeout: 6000 }
    );
  };

  const handleSetReminder = async () => {
    if (!selectedBus) return;
    if (!isOnline) {
      setReminderSaved(`Offline reminder noted for ${selectedBus.bus_number}.`);
      return;
    }
    try {
      await apiFetch('/api/notifications/reminder', {
        method: 'POST',
        body: JSON.stringify({
          bus_number: selectedBus.bus_number,
          next_stop: selectedBus.next_stop_name,
        }),
      });
      await refreshNotifications();
      setReminderSaved(`Reminder set for ${selectedBus.bus_number} before ${selectedBus.next_stop_name}.`);
    } catch {
      setReminderSaved('Unable to set reminder right now.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('track.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('track.subtitle')}</p>
        </div>

        {/* Bus Quick Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {buses.map((b) => {
            const active = selectedBus?.bus_id === b.bus_id;
            return (
              <button
                key={b.bus_id}
                type="button"
                onClick={() => onSelectBus(b)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                  active
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {b.bus_number}
              </button>
            );
          })}
        </div>
      </div>

      {locationNotice && (
        <p className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5">
          {locationNotice}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <MapView
            buses={buses}
            stops={stops}
            selectedBus={selectedBus}
            activeRoute={activeRoute}
            userLocation={userLocation}
            isOnline={isOnline}
            onSelectBus={onSelectBus}
            onRequestLocation={handleRequestLocation}
          />
        </div>

        {/* Selected Bus Information & Vertical Route Timeline */}
        <div className="lg:col-span-5 space-y-5">
          {selectedBus && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-extrabold text-slate-900">
                      BUS {selectedBus.bus_number}
                    </span>
                    <span className="text-xs text-slate-500">· {selectedBus.bus_type}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">
                    {selectedBus.origin} → {selectedBus.destination}
                  </p>
                </div>

                <BusStatus
                  validity={selectedBus.validity_state}
                  isOnline={isOnline}
                  isSimulated={selectedBus.is_simulated}
                  dataMode={dataMode}
                  delayMinutes={selectedBus.delay_minutes}
                />
              </div>

              <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('track.currentLocation')}</span>
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {isOnline ? selectedBus.current_stop_name : 'Synchronized Schedule'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('track.nextStop')}</span>
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {selectedBus.next_stop_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('track.eta')}</span>
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-bold text-emerald-800">
                    {etaDetail ? etaDetail.estimated_eta_minutes : selectedBus.eta_minutes}{' '}
                    {t('track.minutes')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t('track.distance')}</dt>
                  <dd className="mt-1 font-mono tabular-nums font-bold text-slate-900">
                    {etaDetail ? etaDetail.distance_to_next_km : selectedBus.distance_to_next_km} km
                  </dd>
                </div>
              </dl>

              {isOnline && (
                <p className="text-xs text-slate-500 font-mono">
                  {t('track.eta')} = Distance ÷ Average Speed ({selectedBus.speed_kmh} km/h) ·{' '}
                  {selectedBus.latitude.toFixed(4)}, {selectedBus.longitude.toFixed(4)}
                </p>
              )}

              {reminderSaved && (
                <p className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                  {reminderSaved}
                </p>
              )}

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSetReminder}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px]"
                >
                  <BellRing className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>{t('track.setReminder')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onBookBus(selectedBus)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
                >
                  <Ticket className="w-4 h-4" aria-hidden="true" />
                  <span>{t('home.bookNow')}</span>
                </button>
              </div>
            </section>
          )}

          {selectedBus && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">{t('track.routeTimeline')}</h2>
                <span className="text-xs font-mono text-slate-500">
                  {selectedBus.stops.length} {t('track.stopsCount')} · ₹{selectedBus.fare}
                </span>
              </div>
              <RouteTimeline
                stops={selectedBus.stops}
                currentStopIndex={selectedBus.current_stop_index}
                isTripActive={isOnline && selectedBus.is_trip_active}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
