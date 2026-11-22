import { AlertTriangle, Radio, WifiOff } from 'lucide-react';
import React from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import type { BusValidityState, DataMode } from '../types/transit.ts';

interface BusStatusProps {
  validity: BusValidityState;
  isOnline: boolean;
  isSimulated: boolean;
  dataMode: DataMode;
  delayMinutes?: number;
}

export const BusStatus: React.FC<BusStatusProps> = ({
  validity,
  isOnline,
  isSimulated,
  dataMode,
  delayMinutes = 0,
}) => {
  const { t } = useI18n();

  if (!isOnline || validity === 'OFFLINE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
        <WifiOff className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>{t('track.offlineState')}</span>
      </span>
    );
  }

  if (validity === 'DELAYED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
        <span>
          {t('track.delayedState')}
          {delayMinutes > 0 ? ` (+${delayMinutes}m)` : ''}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
      <Radio className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
      <span>
        {isSimulated || dataMode === 'DEMO'
          ? t('app.demoSimulationLabel')
          : t('track.liveState')}
      </span>
    </span>
  );
};
