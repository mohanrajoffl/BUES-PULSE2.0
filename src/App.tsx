import React, { useState } from 'react';
import { Navbar, type AppPage } from './components/Navbar.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { I18nProvider } from './hooks/useI18n.tsx';
import { TransitProvider } from './hooks/useTransitStore.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { BookTicketPage } from './pages/BookTicketPage.tsx';
import { BusDetailsModal } from './pages/BusDetailsModal.tsx';
import { DriverDashboardPage } from './pages/DriverDashboardPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { MyTicketsPage } from './pages/MyTicketsPage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { RoutesPage } from './pages/RoutesPage.tsx';
import { TimingsPage } from './pages/TimingsPage.tsx';
import { TrackBusPage } from './pages/TrackBusPage.tsx';
import type { BusRecord } from './types/transit.ts';

function AppContent() {
  const [page, setPage] = useState<AppPage>('home');
  const [selectedTrackBusId, setSelectedTrackBusId] = useState<string | null>('BUS-DEMO-101');
  const [selectedBookBusId, setSelectedBookBusId] = useState<string | null>('BUS-DEMO-101');
  const [detailsBus, setDetailsBus] = useState<BusRecord | null>(null);

  const navigate = (next: AppPage) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackBus = (bus: BusRecord) => {
    setSelectedTrackBusId(bus.bus_id);
    navigate('track');
  };

  const handleBookBus = (bus: BusRecord) => {
    setSelectedBookBusId(bus.bus_id);
    navigate('book');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
      <Navbar currentPage={page} onNavigate={navigate} />
      <OfflineIndicator />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {page === 'home' && (
          <HomePage
            onNavigate={navigate}
            onSelectBusForTrack={handleTrackBus}
            onSelectBusForDetails={(bus) => setDetailsBus(bus)}
            onSelectBusForBooking={handleBookBus}
          />
        )}

        {page === 'track' && (
          <TrackBusPage
            selectedBusId={selectedTrackBusId}
            onSelectBus={(bus) => setSelectedTrackBusId(bus.bus_id)}
            onBookBus={handleBookBus}
          />
        )}

        {page === 'timings' && (
          <TimingsPage
            onDetails={(bus) => setDetailsBus(bus)}
            onTrack={handleTrackBus}
            onBook={handleBookBus}
          />
        )}

        {page === 'routes' && (
          <RoutesPage
            onTrackBus={handleTrackBus}
            onBookBus={handleBookBus}
            onDetailsBus={(bus) => setDetailsBus(bus)}
          />
        )}

        {page === 'book' && (
          <BookTicketPage
            initialBusId={selectedBookBusId}
            onViewAllTickets={() => navigate('tickets')}
          />
        )}

        {page === 'tickets' && <MyTicketsPage onBookNew={() => navigate('book')} />}

        {page === 'notifications' && <NotificationsPage />}

        {page === 'profile' && <ProfilePage onNavigate={navigate} />}

        {page === 'driver' && <DriverDashboardPage />}

        {page === 'admin' && <AdminDashboardPage />}

        {page === 'auth' && <AuthPage onSuccess={(target) => navigate(target || 'home')} />}
      </main>

      <footer className="hidden md:block border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-slate-500">
          <p>BUSPulse · Salem → Erode Corridor Prototype (Demo Dataset)</p>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => navigate('track')} className="hover:text-slate-900">
              Live Tracking
            </button>
            <button type="button" onClick={() => navigate('timings')} className="hover:text-slate-900">
              Timings
            </button>
            <button type="button" onClick={() => navigate('driver')} className="hover:text-slate-900">
              Driver Console
            </button>
            <button type="button" onClick={() => navigate('admin')} className="hover:text-slate-900">
              Admin
            </button>
          </div>
        </div>
      </footer>

      <BusDetailsModal
        bus={detailsBus}
        onClose={() => setDetailsBus(null)}
        onTrack={handleTrackBus}
        onBook={handleBookBus}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <TransitProvider>
        <AppContent />
      </TransitProvider>
    </I18nProvider>
  );
}
