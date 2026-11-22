import { ArrowRight, Bus, Radio, Search, Ticket, Wifi, WifiOff } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { BusCard } from '../components/BusCard.tsx';
import type { AppPage } from '../components/Navbar.tsx';
import { formatLastSynced } from '../components/OfflineIndicator.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { BusRecord } from '../types/transit.ts';

interface HomePageProps {
  onNavigate: (page: AppPage) => void;
  onSelectBusForTrack: (bus: BusRecord) => void;
  onSelectBusForDetails: (bus: BusRecord) => void;
  onSelectBusForBooking: (bus: BusRecord) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectBusForTrack,
  onSelectBusForDetails,
  onSelectBusForBooking,
}) => {
  const { t } = useI18n();
  const {
    buses,
    dataMode,
    isOnline,
    simulatedOffline,
    setSimulatedOffline,
    lastSyncedAt,
    isLoading,
    user,
    apiFetch,
    updateProfileLocal,
  } = useTransitStore();
  const [query, setQuery] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const filteredBuses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter(
      (b) =>
        b.bus_number.toLowerCase().includes(q) ||
        b.origin.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q) ||
        b.bus_operator.toLowerCase().includes(q) ||
        b.stops.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [buses, query]);

  const handleToggleFavorite = async (busNumber: string) => {
    if (!user) return;
    const exists = user.favorite_buses.includes(busNumber);
    const nextFavs = exists
      ? user.favorite_buses.filter((b) => b !== busNumber)
      : [...user.favorite_buses, busNumber];
    updateProfileLocal({ ...user, favorite_buses: nextFavs });
    if (isOnline) {
      try {
        await apiFetch('/api/users/profile', {
          method: 'PUT',
          body: JSON.stringify({ favorite_buses: nextFavs }),
        });
      } catch {
        // local state kept
      }
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section (2-Column Balanced Split) */}
      <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              {/* Connection State + Value Prop Kicker */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold">
                  {isOnline ? (
                    <>
                      <Wifi className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      <span className="text-emerald-800">{t('app.onlineLive')}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-amber-700" aria-hidden="true" />
                      <span className="text-amber-800">{t('app.offlineMode')}</span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-500 font-mono">{t('app.demoBadge')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSimulatedOffline(!simulatedOffline)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap"
                >
                  {simulatedOffline ? t('app.goOnline') : t('app.simulateOffline')}
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-800 tracking-tight">
                  {t('app.valuePropTitle')}
                </p>
                <h1 className="mt-2 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                  {t('home.heroTitle')}
                </h1>
                <p className="mt-3 text-base text-slate-600 max-w-xl leading-relaxed">
                  {t('home.heroSubtitle')}
                </p>
              </div>
            </div>

            {/* Large Search Component */}
            <div className="space-y-3">
              <div className="relative">
                <Search
                  className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('home.searchPlaceholder')}
                  aria-label={t('home.searchPlaceholder')}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 pl-12 pr-4 py-4 text-sm sm:text-base text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">{t('home.defaultCorridor')}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setQuery('Sankari')}
                    className="hover:text-emerald-800 underline underline-offset-2"
                  >
                    Sankari
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setQuery('Bhavani')}
                    className="hover:text-emerald-800 underline underline-offset-2"
                  >
                    Bhavani
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setQuery('DEMO-101')}
                    className="font-mono hover:text-emerald-800 underline underline-offset-2"
                  >
                    DEMO-101
                  </button>
                </div>
                <span className="font-mono tabular-nums">
                  {t('app.lastSynced')}: {formatLastSynced(lastSyncedAt, t)}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-[380px] bg-emerald-950">
            {!heroImgFailed ? (
              <img
                src="/src/assets/images/hero_salem_corridor_1795328396693.jpg"
                alt="Express coach bus traveling along the Salem to Erode highway corridor"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-emerald-900 to-slate-900 text-white">
                <Bus className="w-12 h-12 text-emerald-300 mb-3" />
                <p className="font-display font-bold text-lg">Salem → Erode Corridor</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-white">
              <p className="text-xs font-mono uppercase tracking-wider text-emerald-300">
                NH-544 · 79 km
              </p>
              <p className="mt-1 text-lg font-bold">Salem → Sankari → Bhavani → Erode</p>
              <p className="mt-1 text-xs text-slate-200">{t('app.tagline')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Highlighted Benefits */}
      <section aria-label="Platform capabilities" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Radio className="w-6 h-6 text-emerald-700" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">{t('home.benefitLiveTitle')}</h2>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {t('home.benefitLiveDesc')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <WifiOff className="w-6 h-6 text-amber-600" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            {t('home.benefitOfflineTitle')}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {t('home.benefitOfflineDesc')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Ticket className="w-6 h-6 text-emerald-700" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            {t('home.benefitTicketTitle')}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {t('home.benefitTicketDesc')}
          </p>
        </div>
      </section>

      {/* Active & Scheduled Corridor Buses */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('home.activeBusesHeading')}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">{t('app.valuePropSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('timings')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-900 whitespace-nowrap"
          >
            <span>{t('home.viewAllTimings')}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl border border-slate-200 bg-white animate-pulse p-5"
              />
            ))}
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-base font-semibold text-slate-900">{t('timings.noBuses')}</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              {t('timings.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredBuses.map((bus) => (
              <BusCard
                key={bus.bus_id}
                bus={bus}
                isOnline={isOnline}
                dataMode={dataMode}
                isFavorite={user?.favorite_buses.includes(bus.bus_number)}
                onToggleFavorite={handleToggleFavorite}
                onTrack={onSelectBusForTrack}
                onDetails={onSelectBusForDetails}
                onBook={onSelectBusForBooking}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
