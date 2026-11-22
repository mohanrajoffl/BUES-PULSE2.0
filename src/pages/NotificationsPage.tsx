import { CheckCheck } from 'lucide-react';
import React from 'react';
import { NotificationCard } from '../components/NotificationCard.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';

export const NotificationsPage: React.FC = () => {
  const { t } = useI18n();
  const { notifications, isOnline, apiFetch, refreshNotifications } = useTransitStore();

  const handleMarkAllRead = async () => {
    if (!isOnline) return;
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    await refreshNotifications();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t('nav.notifications')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Arrivals, corridor delays, bookings, and connectivity alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={!isOnline}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-h-[40px]"
        >
          <CheckCheck className="w-4 h-4" aria-hidden="true" />
          <span>Mark all read</span>
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationCard key={n.notification_id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
};
