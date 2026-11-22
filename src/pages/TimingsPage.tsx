import { ArrowUpDown, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { BusStatus } from '../components/BusStatus.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { BusRecord } from '../types/transit.ts';

interface TimingsPageProps {
  onDetails: (bus: BusRecord) => void;
  onTrack: (bus: BusRecord) => void;
  onBook: (bus: BusRecord) => void;
}

type SortKey = 'earliest' | 'fastest' | 'cheapest' | 'available';

function parseTimeToMinutes(label: string): number {
  const m = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let hr = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hr !== 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  return hr * 60 + min;
}

export const TimingsPage: React.FC<TimingsPageProps> = ({ onDetails, onTrack, onBook }) => {
  const { t } = useI18n();
  const { buses, dataMode, isOnline } = useTransitStore();
  const [fromFilter, setFromFilter] = useState('All');
  const [toFilter, setToFilter] = useState('All');
  const [busType, setBusType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('earliest');

  const rows = useMemo(() => {
    let list = [...buses];
    if (fromFilter !== 'All') list = list.filter((b) => b.origin === fromFilter);
    if (toFilter !== 'All') list = list.filter((b) => b.destination === toFilter);
    if (busType !== 'All') list = list.filter((b) => b.bus_type === busType);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.bus_number.toLowerCase().includes(q) ||
          b.stops.some((s) => s.name.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'fastest') return a.duration_minutes - b.duration_minutes;
      if (sortBy === 'cheapest') return a.fare - b.fare;
      if (sortBy === 'available') return b.available_seats - a.available_seats;
      return parseTimeToMinutes(a.departure_time) - parseTimeToMinutes(b.departure_time);
    });
    return list;
  }, [buses, fromFilter, toFilter, busType, searchTerm, sortBy]);

  const resetFilters = () => {
    setFromFilter('All');
    setToFilter('All');
    setBusType('All');
    setSearchTerm('');
    setSortBy('earliest');
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('timings.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('timings.subtitle')}</p>
      </div>

      {/* Filters Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              aria-label={t('home.searchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <select
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            aria-label={t('timings.from')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">{t('timings.from')}: All</option>
            <option value="Salem">Salem</option>
            <option value="Erode">Erode</option>
          </select>

          <select
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            aria-label={t('timings.to')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">{t('timings.to')}: All</option>
            <option value="Erode">Erode</option>
            <option value="Salem">Salem</option>
          </select>

          <select
            value={busType}
            onChange={(e) => setBusType(e.target.value)}
            aria-label={t('timings.busType')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">{t('timings.busType')}: All</option>
            <option value="Express">Express</option>
            <option value="Deluxe Non-AC">Deluxe Non-AC</option>
            <option value="AC Seater">AC Seater</option>
            <option value="Superfast">Superfast</option>
            <option value="Town Shuttle">Town Shuttle</option>
          </select>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label={t('timings.sortBy')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="earliest">{t('timings.earliest')}</option>
              <option value="fastest">{t('timings.fastest')}</option>
              <option value="cheapest">{t('timings.cheapest')}</option>
              <option value="available">{t('timings.available')}</option>
            </select>
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">{t('timings.noBuses')}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {t('timings.resetFilters')}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">{t('timings.bus')}</th>
                  <th className="py-3.5 px-4">ROUTE</th>
                  <th className="py-3.5 px-4">{t('timings.departure')}</th>
                  <th className="py-3.5 px-4">{t('timings.arrival')}</th>
                  <th className="py-3.5 px-4">{t('timings.duration')}</th>
                  <th className="py-3.5 px-4 text-right">{t('timings.fare')}</th>
                  <th className="py-3.5 px-4">{t('timings.status')}</th>
                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((bus) => (
                  <tr key={bus.bus_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDetails(bus)}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-800 underline underline-offset-2"
                      >
                        {bus.bus_number}
                      </button>
                      <p className="text-xs text-slate-500">{bus.bus_type}</p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                      {bus.origin} → {bus.destination}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-900">
                      {bus.departure_time}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-700">
                      {bus.arrival_time}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-600">
                      {bus.duration}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono tabular-nums font-bold text-slate-900">
                      ₹{bus.fare}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <BusStatus
                        validity={bus.validity_state}
                        isOnline={isOnline}
                        isSimulated={bus.is_simulated}
                        dataMode={dataMode}
                        delayMinutes={bus.delay_minutes}
                      />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onTrack(bus)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {t('routes.track')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onBook(bus)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800 text-xs font-semibold text-white hover:bg-emerald-900"
                        >
                          {t('routes.bookTicket')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
