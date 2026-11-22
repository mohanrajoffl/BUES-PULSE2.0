import { AlertOctagon, AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react';
import React from 'react';
import type { AppNotification } from '../types/transit.ts';

export const NotificationCard: React.FC<{ notification: AppNotification }> = ({ notification }) => {
  const Icon =
    notification.type === 'EMERGENCY'
      ? AlertOctagon
      : notification.type === 'DELAY'
      ? AlertTriangle
      : notification.type === 'BOOKING'
      ? CheckCircle2
      : notification.type === 'ROUTE_CHANGE'
      ? Info
      : Bell;

  const iconColor =
    notification.type === 'EMERGENCY'
      ? 'text-rose-600'
      : notification.type === 'DELAY'
      ? 'text-amber-600'
      : notification.type === 'BOOKING'
      ? 'text-emerald-700'
      : 'text-slate-600';

  const timeLabel = new Date(notification.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`rounded-2xl border p-4 flex items-start gap-3.5 ${
        notification.read ? 'border-slate-200 bg-white' : 'border-emerald-200 bg-emerald-50/40'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">{notification.title}</h4>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
            {timeLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 leading-snug">{notification.message}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
          {notification.bus_number && (
            <>
              <span className="font-mono font-semibold text-slate-700">{notification.bus_number}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>{notification.is_demo ? 'Demo Alert' : 'System Alert'}</span>
        </div>
      </div>
    </div>
  );
};
