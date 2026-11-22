import React from 'react';
import { useI18n } from '../hooks/useI18n.tsx';
import type { LanguageCode } from '../types/transit.ts';

const LANGS: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
];

export const LanguageSelector: React.FC = () => {
  const { lang, setLang } = useI18n();

  return (
    <div
      className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0"
      role="group"
      aria-label="Language selector"
    >
      {LANGS.map((item) => {
        const active = lang === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[30px] focus-visible:outline-2 focus-visible:outline-emerald-700 ${
              active
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={active}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
