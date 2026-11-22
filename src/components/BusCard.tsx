import { ArrowRight, Clock, Heart, MapPin } from 'lucide-react';
import React from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import type { BusRecord, DataMode } from '../types/transit.ts';
import { BusStatus } from './BusStatus.tsx';

interface BusCardProps {
  bus: BusRecord;
  isOnline: boolean;
  dataMode: DataMode;
  isFavorite?: boolean;
  onToggleFavorite?: (busNumber: string) => void;
  onTrack: (bus: BusRecord) => void;
  onDetails: (bus: BusRecord) => void;
  onBook: (bus: BusRecord) => void;
}

export const BusCard: React.FC<BusCardProps> = ({
  bus,
  isOnline,
  dataMode,
  isFavorite = false,
  onToggleFavorite,
  onTrack,
  onDetails,
  onBook,
}) => {
  const { t } = useI18n();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-mono text-base font-bold text-slate-900 tracking-tight">
              {bus.bus_number}
            </h3>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-600">{bus.bus_type}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs text-slate-500">{t('app.demoBadge')}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800 flex items-center gap-1.5">
            <span>{bus.origin}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>{bus.destination}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(bus.bus_number)}
              aria-label={isFavorite ? `Remove ${bus.bus_number} from favorites` : `Save ${bus.bus_number} to favorites`}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>
          )}
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">₹{bus.fare}</p>
            <p className="text-[11px] text-slate-500 tabular-nums">{bus.available_seats} seats</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-800 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {bus.departure_time} – {bus.arrival_time} ({bus.duration})
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            {isOnline && bus.is_trip_active ? (
              <span>
                {bus.current_stop_name} → {bus.next_stop_name} · {t('track.eta')}:{' '}
                <strong className="font-mono tabular-nums text-slate-900">{bus.eta_minutes}m</strong>
              </span>
            ) : (
              <span>{bus.stops.length} {t('track.stopsCount')}</span>
            )}
          </span>
        </div>

        <BusStatus
          validity={bus.validity_state}
          isOnline={isOnline}
          isSimulated={bus.is_simulated}
          dataMode={dataMode}
          delayMinutes={bus.delay_minutes}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onTrack(bus)}
          className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors min-h-[40px] whitespace-nowrap"
        >
          {t('home.trackOnMap')}
        </button>
        <button
          type="button"
          onClick={() => onDetails(bus)}
          className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px] whitespace-nowrap"
        >
          {t('track.viewDetails')}
        </button>
        <button
          type="button"
          onClick={() => onBook(bus)}
          className="flex-1 sm:flex-none sm:ml-auto px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition-colors min-h-[40px] whitespace-nowrap"
        >
          {t('home.bookNow')}
        </button>
      </div>
    </article>
  );
};
