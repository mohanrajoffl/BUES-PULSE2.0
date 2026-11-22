import { Clock, MapPin, Ticket, X } from 'lucide-react';
import React from 'react';
import { BusStatus } from '../components/BusStatus.tsx';
import { RouteTimeline } from '../components/RouteTimeline.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { BusRecord } from '../types/transit.ts';

interface BusDetailsModalProps {
  bus: BusRecord | null;
  onClose: () => void;
  onTrack: (bus: BusRecord) => void;
  onBook: (bus: BusRecord) => void;
}

export const BusDetailsModal: React.FC<BusDetailsModalProps> = ({
  bus,
  onClose,
  onTrack,
  onBook,
}) => {
  const { t } = useI18n();
  const { isOnline, dataMode } = useTransitStore();

  if (!bus) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Bus details for ${bus.bus_number}`}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-xl font-extrabold text-slate-900">{bus.bus_number}</h2>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-medium text-slate-600">{bus.bus_operator}</span>
            </div>
            <p className="mt-1 text-base font-semibold text-slate-800">
              {bus.origin} → {bus.destination} ({bus.bus_type})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bus details"
            className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100">
          <BusStatus
            validity={bus.validity_state}
            isOnline={isOnline}
            isSimulated={bus.is_simulated}
            dataMode={dataMode}
            delayMinutes={bus.delay_minutes}
          />
          <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
            {t('track.fare')}: ₹{bus.fare} · {bus.available_seats}/{bus.total_seats} seats open
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('track.currentLocation')}</span>
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">{bus.current_stop_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t('track.nextStop')}</dt>
            <dd className="mt-1 font-semibold text-slate-900">{bus.next_stop_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('track.eta')}</span>
            </dt>
            <dd className="mt-1 font-mono font-bold text-emerald-800 tabular-nums">
              {bus.eta_minutes} {t('track.minutes')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Operating Hours</dt>
            <dd className="mt-1 font-mono tabular-nums text-slate-800">
              {bus.departure_time} – {bus.arrival_time}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t('track.stopsCount')}</dt>
            <dd className="mt-1 font-mono tabular-nums text-slate-800">{bus.stops.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t('track.operatingDays')}</dt>
            <dd className="mt-1 text-xs text-slate-700">{bus.operating_days.join(', ')}</dd>
          </div>
        </dl>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">{t('track.routeTimeline')}</h3>
          <RouteTimeline
            stops={bus.stops}
            currentStopIndex={bus.current_stop_index}
            isTripActive={isOnline && bus.is_trip_active}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              onTrack(bus);
            }}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px]"
          >
            {t('home.trackOnMap')}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onBook(bus);
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
          >
            <Ticket className="w-4 h-4" aria-hidden="true" />
            <span>{t('home.bookNow')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
