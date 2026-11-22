import {
  Bell,
  Bus,
  Clock,
  Home,
  Map as MapIcon,
  Navigation,
  ShieldCheck,
  Ticket,
  User,
} from 'lucide-react';
import React from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export type AppPage =
  | 'home'
  | 'track'
  | 'timings'
  | 'routes'
  | 'book'
  | 'tickets'
  | 'notifications'
  | 'profile'
  | 'driver'
  | 'admin'
  | 'auth';

interface NavbarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useI18n();
  const { notifications, user } = useTransitStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const desktopLinks: { id: AppPage; label: string }[] = [
    { id: 'home', label: t('nav.home') },
    { id: 'track', label: t('nav.track') },
    { id: 'timings', label: t('nav.timings') },
    { id: 'routes', label: t('nav.routes') },
    { id: 'tickets', label: t('nav.tickets') },
  ];

  const mobileTabs: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'track', label: t('nav.track'), icon: Navigation },
    { id: 'tickets', label: t('nav.tickets'), icon: Ticket },
    { id: 'routes', label: t('nav.routes'), icon: MapIcon },
    { id: 'profile', label: t('nav.profile'), icon: User },
  ];

  return (
    <>
      {/* Desktop & Mobile Top Header (3-Zone Top Bar Contract on Desktop, Compact 52px on Mobile) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <Bus className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <span className="font-display">BUSPulse</span>
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            {desktopLinks.map((link) => {
              const active = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onNavigate(link.id)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                    active
                      ? 'text-emerald-800 border-emerald-700 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className={`relative text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 inline-flex items-center gap-1 ${
                currentPage === 'notifications'
                  ? 'text-emerald-800 border-emerald-700 font-semibold'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <span>{t('nav.notifications')}</span>
              {unreadCount > 0 && (
                <span className="font-mono text-[11px] font-bold text-amber-700 tabular-nums">
                  ({unreadCount})
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Language Switcher + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageSelector />
            <div className="hidden lg:block">
              <PWAInstallButton variant="compact" />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('book')}
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
            >
              {t('nav.book')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate(user ? 'profile' : 'auth')}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 min-h-[38px]"
              aria-label={user ? 'Open profile' : 'Sign in'}
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="max-w-[90px] truncate">{user ? user.name.split(' ')[0] : t('nav.signIn')}</span>
            </button>
          </div>
        </div>

        {/* Desktop Secondary Role & Workspace Utility Bar */}
        <div className="hidden md:block border-t border-slate-100 bg-slate-50/80">
          <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span className="font-medium text-slate-800">{t('home.defaultCorridor')}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{t('app.demoBadge')}</span>
            </div>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => onNavigate('driver')}
                className={`inline-flex items-center gap-1.5 font-medium hover:text-slate-900 whitespace-nowrap ${
                  currentPage === 'driver' ? 'text-emerald-800 font-semibold' : ''
                }`}
              >
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('nav.driver')}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className={`inline-flex items-center gap-1.5 font-medium hover:text-slate-900 whitespace-nowrap ${
                  currentPage === 'admin' ? 'text-emerald-800 font-semibold' : ''
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('nav.admin')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation (64px height, obeys 15% mobile sticky cap) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentPage === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
                  active ? 'text-emerald-800 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="mt-1 text-[10px] tracking-tight truncate max-w-[68px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
