import { CheckCircle2, WifiOff, X } from 'lucide-react';
import React from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';

export function formatLastSynced(iso: string | null, t: (k: string) => string): string {
  if (!iso) return '—';
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin === 0) return t('app.justNow');
  return `${diffMin} ${t('app.minutesAgo')}`;
}

export const OfflineIndicator: React.FC = () => {
  const { t } = useI18n();
  const { isOnline, lastSyncedAt, toastMessage, clearToast, setSimulatedOffline } =
    useTransitStore();

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span className="font-semibold">{t('app.offlineMode')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('app.offlineBanner')}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {t('app.lastSynced')}: {formatLastSynced(lastSyncedAt, t)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSimulatedOffline(false)}
              className="text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700 whitespace-nowrap shrink-0"
            >
              {t('app.goOnline')}
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm rounded-xl bg-slate-900 text-white px-4 py-3 shadow-lg flex items-center gap-3 border border-slate-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <p className="text-xs font-medium leading-snug">{toastMessage}</p>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Dismiss notification"
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
