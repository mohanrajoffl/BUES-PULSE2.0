import L from 'leaflet';
import { LocateFixed, WifiOff } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import type { BusRecord, BusStop, RouteDefinition } from '../types/transit.ts';

interface MapViewProps {
  buses: BusRecord[];
  stops: BusStop[];
  selectedBus: BusRecord | null;
  activeRoute: RouteDefinition | null;
  userLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  onSelectBus: (bus: BusRecord) => void;
  onRequestLocation: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  buses,
  stops,
  selectedBus,
  activeRoute,
  userLocation,
  isOnline,
  onSelectBus,
  onRequestLocation,
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!isOnline || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [11.49, 77.91],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [isOnline]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group || !isOnline) return;

    group.clearLayers();

    // Draw corridor route polyline
    const polyPoints =
      activeRoute?.polyline ||
      (stops.length > 0 ? stops.map((s) => [s.latitude, s.longitude] as [number, number]) : []);
    if (polyPoints.length >= 2) {
      L.polyline(polyPoints, {
        color: '#065F46',
        weight: 5,
        opacity: 0.78,
      }).addTo(group);
    }

    // Draw stop markers
    stops.forEach((stop) => {
      const marker = L.circleMarker([stop.latitude, stop.longitude], {
        radius: 6,
        fillColor: '#FFFFFF',
        color: '#0F172A',
        weight: 2,
        fillOpacity: 1,
      });
      marker.bindTooltip(`${stop.name} (${stop.distance_km} km)`, {
        direction: 'top',
        offset: [0, -6],
      });
      marker.addTo(group);
    });

    // Draw user location marker if present
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'buspulse-user-pin',
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindTooltip(t('track.userLocation'))
        .addTo(group);
    }

    // Draw bus markers (only active or scheduled buses)
    buses.forEach((bus) => {
      const isSelected = selectedBus?.bus_id === bus.bus_id;
      const bg =
        bus.validity_state === 'DELAYED'
          ? '#D97706'
          : bus.is_trip_active
          ? '#065F46'
          : '#475569';
      const border = isSelected ? '#0F172A' : '#FFFFFF';
      const busIcon = L.divIcon({
        className: 'buspulse-bus-marker',
        html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;background:${bg};color:#FFFFFF;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;border:2px solid ${border};box-shadow:0 3px 10px rgba(15,23,42,0.28);white-space:nowrap;transform:${isSelected ? 'scale(1.08)' : 'scale(1)'};">${bus.bus_number}</div>`,
        iconSize: [86, 28],
        iconAnchor: [43, 14],
      });

      const m = L.marker([bus.latitude, bus.longitude], { icon: busIcon });
      m.on('click', () => onSelectBus(bus));
      m.addTo(group);
    });
  }, [buses, stops, selectedBus, activeRoute, userLocation, isOnline, onSelectBus, t]);

  useEffect(() => {
    if (mapRef.current && selectedBus && isOnline) {
      mapRef.current.panTo([selectedBus.latitude, selectedBus.longitude], { animate: true });
    }
  }, [selectedBus?.bus_id, isOnline]);

  // Offline schematic fallback (never fakes live GPS while offline)
  if (!isOnline) {
    return (
      <div className="relative h-[380px] sm:h-[460px] w-full rounded-2xl border border-slate-200 bg-slate-100 p-6 flex flex-col justify-between overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
              <WifiOff className="w-4 h-4" aria-hidden="true" />
              <span>{t('app.offlineMode')}</span>
            </p>
            <p className="mt-1 text-sm text-slate-700">{t('track.gpsUnavailableOffline')}</p>
          </div>
        </div>

        <div className="my-auto py-6">
          <p className="text-xs font-medium text-slate-500 mb-4">
            {activeRoute?.name || 'Salem → Erode Corridor'} (Cached Corridor Schematic)
          </p>
          <div className="relative flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="absolute left-3 right-3 top-3 h-0.5 bg-slate-300" aria-hidden="true" />
            {stops.map((stop) => (
              <div key={stop.stop_id} className="relative z-10 flex flex-col items-center min-w-[90px] text-center">
                <span className="w-6 h-6 rounded-full bg-white border-2 border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-slate-800">
                  {stop.sequence}
                </span>
                <span className="mt-2 text-xs font-semibold text-slate-800 leading-tight">
                  {stop.name}
                </span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {stop.distance_km} km
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Map tiles and live coordinates will resume automatically when connectivity returns.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[380px] sm:h-[480px] w-full rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive Salem to Erode bus tracking map" />

      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={onRequestLocation}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-white min-h-[40px]"
        >
          <LocateFixed className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          <span>{t('track.userLocation')}</span>
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-[400] rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-xs">
        {t('app.demoSimulationLabel')} · OpenStreetMap
      </div>
    </div>
  );
};
