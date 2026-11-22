import { Database, Heart, LogOut, RefreshCw, ShieldCheck, Trash2, Truck, WifiOff } from 'lucide-react';
import React from 'react';
import { LanguageSelector } from '../components/LanguageSelector.tsx';
import type { AppPage } from '../components/Navbar.tsx';
import { formatLastSynced } from '../components/OfflineIndicator.tsx';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';

interface ProfilePageProps {
  onNavigate: (page: AppPage) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const {
    user,
    tickets,
    isOnline,
    simulatedOffline,
    setSimulatedOffline,
    lastSyncedAt,
    syncAll,
    clearCache,
    logout,
  } = useTransitStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t('profile.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage saved corridors, offline cache, language, and role access.
          </p>
        </div>
        <PWAInstallButton variant="card" />
      </div>

      {/* User Identity Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">
              {user ? user.name : 'Guest Passenger'}
            </h2>
            <span className="font-mono text-xs font-semibold text-emerald-800">
              · {user ? user.role : 'PASSENGER'}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {user ? `${user.email} · ${user.phone}` : 'Sign in to sync personal bookings'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('profile.signOut')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[40px]"
            >
              {t('nav.signIn')}
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Favorites & Saved Routes */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" aria-hidden="true" />
            <span>{t('profile.favorites')}</span>
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">Favorite Buses</p>
              <p className="mt-1 font-mono font-semibold text-slate-900">
                {user?.favorite_buses.length ? user.favorite_buses.join(' · ') : 'DEMO-101'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Favorite Stops</p>
              <p className="mt-1 text-slate-800">
                {user?.favorite_stops.length
                  ? user.favorite_stops.join(' · ')
                  : 'Salem New Bus Stand · Sankari · Erode'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{t('profile.savedRoutes')}</p>
              <p className="mt-1 text-slate-800">
                {user?.saved_routes.length ? user.saved_routes.join(' · ') : 'Salem → Erode'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Booking History</span>
              <button
                type="button"
                onClick={() => onNavigate('tickets')}
                className="font-semibold text-emerald-800 hover:underline"
              >
                {tickets.length} Tickets →
              </button>
            </div>
          </div>
        </section>

        {/* Language & Offline Settings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>{t('profile.offlineSettings')}</span>
          </h2>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-700">{t('profile.language')}</span>
            <LanguageSelector />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Connection State</span>
              <span className="font-semibold text-slate-900">
                {isOnline ? t('app.onlineLive') : t('app.offlineMode')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('app.lastSynced')}</span>
              <span className="font-mono tabular-nums text-slate-900">
                {formatLastSynced(lastSyncedAt, t)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => syncAll(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('profile.syncNow')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulatedOffline(!simulatedOffline)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
            >
              <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{simulatedOffline ? t('app.goOnline') : t('app.simulateOffline')}</span>
            </button>
            <button
              type="button"
              onClick={clearCache}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('profile.clearCache')}</span>
            </button>
          </div>
        </section>
      </div>

      {/* Role Workspaces Access */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-bold text-slate-900">Operations Workspaces</h2>
        <p className="text-xs text-slate-600 mt-1">
          Switch to Driver telemetry or Admin fleet management consoles.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate('driver')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
          >
            <Truck className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span>{t('driver.title')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>{t('admin.title')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
          >
            <span>Switch Account / Sign In</span>
          </button>
        </div>
      </section>
    </div>
  );
};
