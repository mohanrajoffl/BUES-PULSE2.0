import React, { createContext, useContext, useEffect, useState } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';
import type { LanguageCode } from '../types/transit.ts';

type TranslationDictionary = typeof en;

const DICTIONARIES: Record<LanguageCode, TranslationDictionary> = { en, ta, hi };
const STORAGE_KEY = 'buspulse_language';

interface I18nContextValue {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ta' || saved === 'hi') return saved;
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  const setLang = (code: LanguageCode) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (keyPath: string): string => {
    const parts = keyPath.split('.');
    let curr: unknown = DICTIONARIES[lang];
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = (curr as Record<string, unknown>)[part];
      } else {
        curr = undefined;
        break;
      }
    }
    if (typeof curr === 'string') return curr;

    // Fallback to English
    let fallback: unknown = DICTIONARIES.en;
    for (const part of parts) {
      if (fallback && typeof fallback === 'object' && part in fallback) {
        fallback = (fallback as Record<string, unknown>)[part];
      } else {
        return keyPath;
      }
    }
    return typeof fallback === 'string' ? fallback : keyPath;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
