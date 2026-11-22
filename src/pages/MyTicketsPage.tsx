import React, { useMemo, useState } from 'react';
import { TicketCard } from '../components/TicketCard.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { TicketStatus } from '../types/transit.ts';

interface MyTicketsPageProps {
  onBookNew: () => void;
}

export const MyTicketsPage: React.FC<MyTicketsPageProps> = ({ onBookNew }) => {
  const { t } = useI18n();
  const { tickets, isOnline, apiFetch, refreshTickets } = useTransitStore();
  const [activeTab, setActiveTab] = useState<TicketStatus>('Upcoming');
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(
    () => tickets.filter((ticket) => ticket.status === activeTab),
    [tickets, activeTab]
  );

  const handleCancel = async (ticketId: string) => {
    if (!isOnline) {
      setFeedback('Ticket cancellation requires an internet connection.');
      return;
    }
    try {
      await apiFetch(`/api/tickets/${ticketId}/cancel`, { method: 'PATCH' });
      await refreshTickets();
      setFeedback(`Ticket ${ticketId} cancelled.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to cancel ticket.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('tickets.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Synchronized to IndexedDB for offline QR boarding.
          </p>
        </div>
        <button
          type="button"
          onClick={onBookNew}
          className="px-4 py-2.5 rounded-xl bg-emerald-800 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[40px]"
        >
          {t('tickets.bookFirst')}
        </button>
      </div>

      {/* Segmented Status Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
        {([
          { id: 'Upcoming', label: t('tickets.upcoming') },
          { id: 'Completed', label: t('tickets.completed') },
          { id: 'Cancelled', label: t('tickets.cancelled') },
        ] as const).map((tab) => {
          const count = tickets.filter((item) => item.status === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {feedback && (
        <p className="text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5">
          {feedback}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">{t('tickets.empty')}</p>
          <button
            type="button"
            onClick={onBookNew}
            className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-800 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[40px]"
          >
            {t('tickets.bookFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.ticket_id}
              ticket={ticket}
              onCancel={handleCancel}
              onNotify={(msg) => setFeedback(msg)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
