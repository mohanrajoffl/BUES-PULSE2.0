import { Download, QrCode, Share2, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import type { TicketRecord } from '../types/transit.ts';

interface TicketCardProps {
  ticket: TicketRecord;
  onCancel?: (ticketId: string) => void;
  onNotify?: (msg: string) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onCancel, onNotify }) => {
  const { t } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(ticket.qr_token, {
      width: 240,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ticket.qr_token]);

  const handleDownload = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 680;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#065F46';
    ctx.fillRect(0, 0, canvas.width, 76);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('BUSPulse Digital Ticket', 28, 46);
    ctx.font = '14px monospace';
    ctx.fillText(`DEMO TICKET · ${ticket.status.toUpperCase()}`, 430, 44);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Ticket ID: ${ticket.ticket_id}`, 28, 120);
    ctx.fillText(`Bus: ${ticket.bus_number}   Seat: ${ticket.seat_number}`, 28, 152);

    ctx.font = '16px sans-serif';
    ctx.fillText(`Route: ${ticket.origin} → ${ticket.destination}`, 28, 192);
    ctx.fillText(`Date & Time: ${ticket.travel_date} · ${ticket.departure_time}`, 28, 224);
    ctx.fillText(`Passenger: ${ticket.passenger_name} (${ticket.passenger_age}, ${ticket.passenger_gender})`, 28, 256);
    ctx.fillText(`Fare: ₹${ticket.fare} (${ticket.payment_mode})`, 28, 288);

    ctx.fillStyle = '#64748B';
    ctx.font = '12px monospace';
    ctx.fillText(ticket.qr_token, 28, 386);

    if (qrDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 460, 110, 180, 180);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `BUSPulse-${ticket.ticket_id}.png`;
        a.click();
        onNotify?.(`Downloaded ticket ${ticket.ticket_id}`);
      };
      img.src = qrDataUrl;
    }
  };

  const handleShare = async () => {
    const summary = `BUSPulse Ticket ${ticket.ticket_id}\nBus: ${ticket.bus_number}\nRoute: ${ticket.origin} → ${ticket.destination}\nDate: ${ticket.travel_date} at ${ticket.departure_time}\nPassenger: ${ticket.passenger_name}\nStatus: ${ticket.status}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `BUSPulse Ticket ${ticket.ticket_id}`, text: summary });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summary);
        onNotify?.('Ticket summary copied to clipboard.');
      }
    } catch {
      // user cancelled share
    }
  };

  const statusTone =
    ticket.status === 'Upcoming'
      ? 'text-emerald-800'
      : ticket.status === 'Completed'
      ? 'text-slate-600'
      : 'text-rose-700';

  return (
    <>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span className="font-mono font-bold text-slate-900">{ticket.ticket_id}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono font-semibold text-emerald-800">{ticket.bus_number}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className={`font-semibold ${statusTone}`}>{ticket.status}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">{ticket.payment_mode}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {ticket.origin} → {ticket.destination}
            </h3>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-1 text-xs">
              <div>
                <dt className="text-slate-500">{t('booking.travelDate')}</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {ticket.travel_date}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('timings.departure')}</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {ticket.departure_time}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('tickets.passenger')}</dt>
                <dd className="font-semibold text-slate-900 mt-0.5 truncate">
                  {ticket.passenger_name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {t('tickets.seat')} / {t('timings.fare')}
                </dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {ticket.seat_number} · ₹{ticket.fare}
                </dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="shrink-0 self-start rounded-xl border border-slate-200 p-2 bg-white hover:border-emerald-700 transition-colors"
            aria-label={`View QR code for ticket ${ticket.ticket_id}`}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ticket ${ticket.ticket_id}`}
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center bg-slate-50">
                <QrCode className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </button>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
          >
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('booking.viewQr')}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('tickets.download')}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('booking.shareTicket')}</span>
          </button>
          {ticket.status === 'Upcoming' && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(ticket.ticket_id)}
              className="sm:ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 min-h-[40px]"
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('tickets.cancel')}</span>
            </button>
          )}
        </div>
      </article>

      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Digital QR Ticket ${ticket.ticket_id}`}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 border border-slate-200 shadow-xl text-center">
            <p className="font-mono text-xs font-semibold text-emerald-800">BUSPulse · {ticket.payment_mode}</p>
            <h4 className="mt-1 text-lg font-bold text-slate-900">{ticket.origin} → {ticket.destination}</h4>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {ticket.ticket_id} · {ticket.bus_number} · Seat {ticket.seat_number}
            </p>
            <div className="my-5 flex justify-center">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR pass ${ticket.ticket_id}`}
                  className="w-52 h-52 rounded-xl border border-slate-200 p-2 bg-white"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-500 break-all">{ticket.qr_token}</p>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
