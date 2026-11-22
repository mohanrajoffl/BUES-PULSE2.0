import { CheckCircle2, Circle, Navigation } from 'lucide-react';
import React from 'react';
import type { RouteStopTiming } from '../types/transit.ts';

interface RouteTimelineProps {
  stops: RouteStopTiming[];
  currentStopIndex: number;
  isTripActive: boolean;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  stops,
  currentStopIndex,
  isTripActive,
}) => {
  return (
    <ol className="relative space-y-0" aria-label="Bus route stops">
      {stops.map((stop, idx) => {
        const passed = isTripActive && idx < currentStopIndex;
        const current = isTripActive && idx === currentStopIndex;
        const next = isTripActive && idx === currentStopIndex + 1;
        const isLast = idx === stops.length - 1;

        return (
          <li key={stop.stop_id} className="relative flex items-start gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${
                  passed ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            )}

            <div className="relative z-10 mt-0.5 shrink-0 bg-white">
              {passed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" aria-hidden="true" />
              ) : current ? (
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              ) : next ? (
                <div className="w-6 h-6 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
              ) : (
                <Circle className="w-6 h-6 text-slate-300" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
              <div>
                <p
                  className={`text-sm font-medium ${
                    current
                      ? 'text-emerald-900 font-semibold'
                      : next
                      ? 'text-amber-900 font-semibold'
                      : passed
                      ? 'text-slate-500'
                      : 'text-slate-800'
                  }`}
                >
                  {stop.name}
                </p>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  {stop.distance_km} km
                  {current ? ' · Current' : next ? ' · Next Stop' : ''}
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 shrink-0">
                {stop.scheduled_time}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
