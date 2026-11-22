import { ArrowLeftRight, ArrowRight, Clock, IndianRupee, MapPin } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { BusRecord, RouteDefinition } from '../types/transit.ts';

interface RoutesPageProps {
  onTrackBus: (bus: BusRecord) => void;
  onBookBus: (bus: BusRecord) => void;
  onDetailsBus: (bus: BusRecord) => void;
}

export const RoutesPage: React.FC<RoutesPageProps> = ({
  onTrackBus,
  onBookBus,
  onDetailsBus,
}) => {
  const { t } = useI18n();
  const { routes, buses } = useTransitStore();
  const [fromCity, setFromCity] = useState('Salem');
  const [toCity, setToCity] = useState('Erode');
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const matchingRoutes = useMemo(() => {
    return routes.filter(
      (r) =>
        r.origin.toLowerCase() === fromCity.toLowerCase() &&
        r.destination.toLowerCase() === toCity.toLowerCase()
    );
  }, [routes, fromCity, toCity]);

  const handleSwap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const getPrimaryBusForRoute = (route: RouteDefinition): BusRecord | undefined => {
    return buses.find((b) => b.route_id === route.route_id) || buses[0];
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('routes.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('routes.subtitle')}</p>
      </div>

      {/* Origin / Destination Selector */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t('routes.fromLabel')}
            </label>
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="Salem">Salem</option>
              <option value="Erode">Erode</option>
            </select>
          </div>

          <div className="sm:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              aria-label={t('routes.swap')}
              className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t('routes.toLabel')}
            </label>
            <select
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="Erode">Erode</option>
              <option value="Salem">Salem</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{t('routes.recommended')}</h2>

        {matchingRoutes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            {t('timings.noBuses')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {matchingRoutes.map((route, index) => {
              const primaryBus = getPrimaryBusForRoute(route);
              const isExpanded = expandedRouteId === route.route_id;
              return (
                <article
                  key={route.route_id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono font-semibold text-emerald-800">
                        Route {index + 1} · {route.route_number}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{route.name}</h3>
                    </div>
                    <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      ₹{route.base_fare}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 flex flex-wrap items-center gap-1.5">
                    {route.via.map((stop, idx) => (
                      <React.Fragment key={stop}>
                        <span className="font-medium">{stop}</span>
                        {idx < route.via.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        )}
                      </React.Fragment>
                    ))}
                  </p>

                  <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {route.typical_duration}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {route.distance_km} km ({route.stops.length} stops)
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      Base ₹{route.base_fare}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 space-y-1.5">
                      {route.stops.map((stop, sIdx) => (
                        <div
                          key={stop.stop_id}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="text-slate-700 font-medium">
                            {sIdx + 1}. {stop.name}
                          </span>
                          <span className="font-mono tabular-nums text-slate-500">
                            {stop.distance_km} km · {stop.scheduled_time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRouteId(isExpanded ? null : route.route_id)
                      }
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
                    >
                      {t('routes.viewRoute')}
                    </button>
                    {primaryBus && (
                      <>
                        <button
                          type="button"
                          onClick={() => onTrackBus(primaryBus)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
                        >
                          {t('routes.track')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDetailsBus(primaryBus)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
                        >
                          {t('track.viewDetails')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onBookBus(primaryBus)}
                          className="ml-auto px-4 py-2 rounded-xl bg-emerald-800 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[40px]"
                        >
                          {t('routes.bookTicket')}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
