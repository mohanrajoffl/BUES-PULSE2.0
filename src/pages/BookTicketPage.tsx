import { CheckCircle2, CreditCard, Landmark, Smartphone } from 'lucide-react';
import React, { useState } from 'react';
import { TicketCard } from '../components/TicketCard.tsx';
import { useI18n } from '../hooks/useI18n.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { TicketRecord } from '../types/transit.ts';

interface BookTicketPageProps {
  initialBusId: string | null;
  onViewAllTickets: () => void;
}

export const BookTicketPage: React.FC<BookTicketPageProps> = ({
  initialBusId,
  onViewAllTickets,
}) => {
  const { t } = useI18n();
  const { buses, user, isOnline, apiFetch, refreshTickets } = useTransitStore();

  const defaultBus =
    buses.find((b) => b.bus_id === initialBusId || b.bus_number === initialBusId) || buses[0];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBusId, setSelectedBusId] = useState<string>(defaultBus?.bus_id || 'BUS-DEMO-101');
  const [travelDate, setTravelDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [passengerName, setPassengerName] = useState<string>(user?.name || 'Mohan');
  const [passengerAge, setPassengerAge] = useState<string>('28');
  const [passengerGender, setPassengerGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [passengerPhone, setPassengerPhone] = useState<string>(user?.phone || '+91 98427 11204');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Net Banking'>('UPI');
  const [upiId, setUpiId] = useState('mohan@okaxis');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<TicketRecord | null>(null);

  const selectedBus = buses.find((b) => b.bus_id === selectedBusId) || buses[0];

  const handleConfirmBooking = async () => {
    if (!selectedBus) return;
    if (!isOnline) {
      setError('Online connection is required to generate a new ticket.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ ticket: TicketRecord }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          bus_id: selectedBus.bus_id,
          origin: selectedBus.origin,
          destination: selectedBus.destination,
          travel_date: travelDate,
          departure_time: selectedBus.departure_time,
          passenger_name: passengerName,
          passenger_age: Number(passengerAge) || 25,
          passenger_gender: passengerGender,
          passenger_phone: passengerPhone,
          payment_method: paymentMethod,
        }),
      });
      setConfirmedTicket(res.ticket);
      await refreshTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete demo booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedTicket) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold text-emerald-950">{t('booking.ticketConfirmed')}</h1>
            <p className="text-xs text-emerald-800 mt-0.5">
              Saved to your account and synced for offline QR boarding.
            </p>
          </div>
        </div>

        <TicketCard ticket={confirmedTicket} />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setConfirmedTicket(null);
              setStep(1);
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px]"
          >
            Book Another Ticket
          </button>
          <button
            type="button"
            onClick={onViewAllTickets}
            className="px-5 py-2.5 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
          >
            {t('nav.tickets')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{t('booking.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('booking.demoPaymentNote')}</p>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        {([
          { id: 1, label: t('booking.step1') },
          { id: 2, label: t('booking.step2') },
          { id: 3, label: t('booking.step3') },
          { id: 4, label: t('booking.step4') },
        ] as const).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.id < step && setStep(s.id)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold transition-colors truncate ${
              step === s.id
                ? 'bg-white text-slate-900 shadow-xs'
                : s.id < step
                ? 'text-emerald-800 hover:bg-white/60'
                : 'text-slate-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('booking.step1')}</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t('booking.selectBus')}
              </label>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
              >
                {buses.map((b) => (
                  <option key={b.bus_id} value={b.bus_id}>
                    {b.bus_number} · {b.origin} → {b.destination} · {b.departure_time} · ₹{b.fare} ({b.bus_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t('booking.travelDate')}
                </label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                />
              </div>
              {selectedBus && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {t('timings.departure')} / {t('timings.fare')}
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800">
                    {selectedBus.departure_time} → {selectedBus.arrival_time} · ₹{selectedBus.fare}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
              >
                {t('booking.next')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('booking.step2')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t('booking.passengerName')}
                </label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t('booking.age')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={110}
                  value={passengerAge}
                  onChange={(e) => setPassengerAge(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t('booking.gender')}
                </label>
                <select
                  value={passengerGender}
                  onChange={(e) =>
                    setPassengerGender(e.target.value as 'Male' | 'Female' | 'Other')
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                >
                  <option value="Male">{t('booking.male')}</option>
                  <option value="Female">{t('booking.female')}</option>
                  <option value="Other">{t('booking.other')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t('booking.phone')}
                </label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                {t('booking.back')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!passengerName.trim() || passengerPhone.trim().length < 7) {
                    setError('Please enter passenger name and valid phone number.');
                    return;
                  }
                  setError(null);
                  setStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
              >
                {t('booking.next')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedBus && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('booking.step3')}</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Bus</dt>
                <dd className="font-mono font-bold text-slate-900">
                  {selectedBus.bus_number} ({selectedBus.bus_type})
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Route</dt>
                <dd className="font-semibold text-slate-900">
                  {selectedBus.origin} → {selectedBus.destination}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">{t('booking.travelDate')}</dt>
                <dd className="font-mono text-slate-900">{travelDate}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">{t('timings.departure')}</dt>
                <dd className="font-mono text-slate-900">{selectedBus.departure_time}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">{t('tickets.passenger')}</dt>
                <dd className="font-semibold text-slate-900">
                  {passengerName} · {passengerAge} · {passengerGender}
                </dd>
              </div>
              <div className="py-3 flex justify-between text-base">
                <dt className="font-bold text-slate-900">{t('timings.fare')}</dt>
                <dd className="font-mono font-extrabold text-emerald-800 tabular-nums">
                  ₹{selectedBus.fare}
                </dd>
              </div>
            </dl>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                {t('booking.back')}
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 min-h-[44px]"
              >
                {t('booking.next')}
              </button>
            </div>
          </div>
        )}

        {step === 4 && selectedBus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{t('booking.step4')}</h2>
              <span className="text-xs font-mono font-semibold text-amber-800">
                Demo Payment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { id: 'UPI', label: t('booking.upi'), icon: Smartphone },
                { id: 'Card', label: t('booking.card'), icon: CreditCard },
                { id: 'Net Banking', label: t('booking.netBanking'), icon: Landmark },
              ] as const).map((method) => {
                const Icon = method.icon;
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-sm font-semibold transition-colors min-h-[48px] ${
                      active
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>

            {paymentMethod === 'UPI' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Demo UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900"
                />
              </div>
            )}

            {paymentMethod === 'Card' && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                Demo Card Simulation enabled — no real card numbers are collected or stored.
              </p>
            )}

            {paymentMethod === 'Net Banking' && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                Demo Net Banking gateway — instant simulated confirmation for prototype evaluation.
              </p>
            )}

            <div className="pt-2 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                {t('booking.back')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmBooking}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? 'Processing...' : `${t('booking.confirmPay')} (₹${selectedBus.fare})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
