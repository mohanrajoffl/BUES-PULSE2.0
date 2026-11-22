import { KeyRound, Shield, Truck, User } from 'lucide-react';
import React, { useState } from 'react';
import type { AppPage } from '../components/Navbar.tsx';
import { useTransitStore } from '../hooks/useTransitStore.tsx';
import type { UserRole } from '../types/transit.ts';

interface AuthPageProps {
  onSuccess: (target?: AppPage) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { loginDemoRole, loginWithEmail, registerAccount, apiFetch, dataMode } =
    useTransitStore();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onSuccess('home');
      } else if (mode === 'register') {
        await registerAccount({ name, email, phone, password, role });
        onSuccess(role === 'DRIVER' ? 'driver' : 'home');
      } else {
        const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setMessage(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemoLogin = async (targetRole: UserRole) => {
    setError(null);
    setBusy(true);
    try {
      await loginDemoRole(targetRole);
      onSuccess(
        targetRole === 'DRIVER' ? 'driver' : targetRole === 'ADMIN' ? 'admin' : 'home'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-16">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          BUSPulse Account Access
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Role-based sign-in for Passengers, Bus Drivers, and Transit Administrators.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
        {([
          { id: 'login', label: 'Sign In' },
          { id: 'register', label: 'Register' },
          { id: 'forgot', label: 'Reset Password' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setError(null);
              setMessage(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
      >
        {mode === 'register' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mohan Raj"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'PASSENGER' | 'DRIVER')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
                >
                  <option value="PASSENGER">Passenger</option>
                  <option value="DRIVER">Bus Driver</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
          />
        </div>

        {mode !== 'forgot' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-700 focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-800 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 min-h-[44px]"
        >
          {busy
            ? 'Please wait...'
            : mode === 'login'
            ? 'Sign In'
            : mode === 'register'
            ? 'Create Account'
            : 'Send Reset Instructions'}
        </button>
      </form>

      {dataMode === 'DEMO' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Demo Prototype Role Access</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">DEMO MODE</span>
          </div>
          <p className="text-xs text-slate-600">
            Test role-gated Passenger, Driver, and Admin workflows instantly in Demo Mode.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDemoLogin('PASSENGER')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
            >
              <User className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>Demo Passenger</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDemoLogin('DRIVER')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>Demo Driver</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDemoLogin('ADMIN')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[42px]"
            >
              <Shield className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
              <span>Demo Admin</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
