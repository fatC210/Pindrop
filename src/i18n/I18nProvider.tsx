'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import {
  PREFERENCES_UPDATED_EVENT,
  preferencesStore,
} from '@/components/settings/preferencesStore';
import { getMessages, type AppMessages } from './messages';
import { DEFAULT_LOCALE, type AppLocale } from './types';

interface I18nContextValue {
  locale: AppLocale;
  messages: AppMessages;
  setLocale: (locale: AppLocale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const localeSubscribers = new Set<() => void>();
let transientLocale: AppLocale | null = null;

function readPreferredLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  return preferencesStore.loadPreferences().interfaceLanguage;
}

function notifyLocaleSubscribers(): void {
  for (const subscriber of localeSubscribers) {
    subscriber();
  }
}

function getLocaleSnapshot(): AppLocale {
  return transientLocale ?? readPreferredLocale();
}

function subscribeLocale(onStoreChange: () => void): () => void {
  localeSubscribers.add(onStoreChange);

  if (typeof window === 'undefined') {
    return () => {
      localeSubscribers.delete(onStoreChange);
    };
  }

  const syncStoredLocale = (): void => {
    transientLocale = null;
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent): void => {
    if (event.key == null || event.key === 'pindrop_preferences') {
      syncStoredLocale();
    }
  };

  window.addEventListener(PREFERENCES_UPDATED_EVENT, syncStoredLocale);
  window.addEventListener('storage', handleStorage);

  return (): void => {
    localeSubscribers.delete(onStoreChange);
    window.removeEventListener(PREFERENCES_UPDATED_EVENT, syncStoredLocale);
    window.removeEventListener('storage', handleStorage);
  };
}

function setTransientLocale(nextLocale: AppLocale): void {
  transientLocale = nextLocale;
  notifyLocaleSubscribers();
}

function syncDocumentMetadata(messages: AppMessages, locale: AppLocale): void {
  document.documentElement.lang = locale;
  document.title = messages.metadata.title;

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', messages.metadata.description);
  }
}

export function I18nProvider({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    () => DEFAULT_LOCALE
  );
  const messages = useMemo(() => getMessages(locale), [locale]);

  const setLocale = useCallback((nextLocale: AppLocale): void => {
    setTransientLocale(nextLocale);
  }, []);

  useEffect(() => {
    syncDocumentMetadata(messages, locale);
  }, [locale, messages]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      setLocale,
    }),
    [locale, messages, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}
