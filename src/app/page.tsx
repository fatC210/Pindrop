'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import {
  preferencesStore,
} from '@/components/settings/preferencesStore';
import { useI18n } from '@/i18n/I18nProvider';
import { APP_LOCALES, type AppLocale } from '@/i18n/types';
import { SettingsPanel } from '@/components/settings';
import { useSoundscapeSession } from '@/hooks/useSoundscapeSession';
import styles from './page.module.css';

const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => ({ default: mod.MapView })),
  { ssr: false }
);

export default function Home(): React.JSX.Element {
  const { locale, messages, setLocale } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const session = useSoundscapeSession();

  const handleOpenSettings = useCallback((): void => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback((): void => {
    setIsSettingsOpen(false);
    window.setTimeout(() => {
      settingsButtonRef.current?.focus();
    }, 0);
  }, []);

  const handleLanguageChange = useCallback(
    (nextLocale: AppLocale): void => {
      if (nextLocale === locale) {
        return;
      }

      setLocale(nextLocale);
      preferencesStore.savePreferences({
        ...session.preferences,
        interfaceLanguage: nextLocale,
      });
    },
    [locale, session.preferences, setLocale]
  );

  const handleCoordinateSelect = useCallback((lat: number, lng: number): void => {
    void session.handleCoordinateSelect(lat, lng);
  }, [session]);

  const handleMarkerSelect = useCallback((cacheKey: string): void => {
    void session.handleMarkerSelect(cacheKey);
  }, [session]);

  const handleFavoriteSelect = useCallback((cacheKey: string): void => {
    void session.handleFavoriteSelect(cacheKey);
  }, [session]);

  const handleHoverPreview = useCallback((lat: number, lng: number): void => {
    void session.handleHoverPreview(lat, lng);
  }, [session]);

  const heroCopy = useMemo(() => {
    if (session.hasConfiguredApiKey === false) {
      return {
        text: messages.home.apiKeyRequiredCopy,
        tone: 'warning' as const,
      };
    }

    if (session.isAudioSupported === false) {
      return {
        text: messages.home.audioUnavailableCopy,
        tone: 'warning' as const,
      };
    }

    if (session.status === 'error' && session.errorMessage) {
      return {
        text: session.errorMessage,
        tone: 'error' as const,
      };
    }

    if (session.status === 'loading') {
      return {
        text: session.statusMessage,
        tone: 'default' as const,
      };
    }

    if (session.currentRecipe) {
      return {
        text: session.sceneDescription,
        tone: 'default' as const,
      };
    }

    return {
      text: messages.session.idleScene,
      tone: 'default' as const,
    };
  }, [
    messages.home.apiKeyRequiredCopy,
    messages.home.audioUnavailableCopy,
    messages.session.idleScene,
    session.currentRecipe,
    session.errorMessage,
    session.hasConfiguredApiKey,
    session.isAudioSupported,
    session.sceneDescription,
    session.status,
    session.statusMessage,
  ]);

  const heroNoteClassName = `${styles.heroNote}${
    heroCopy.tone === 'warning'
      ? ` ${styles.heroNoteWarning}`
      : heroCopy.tone === 'error'
        ? ` ${styles.heroNoteError}`
        : ''
  }`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.brandHeading}>
            <Image
              className={styles.brandLogo}
              src="/pindrop-logo.svg"
              alt=""
              width={136}
              height={96}
              priority
              aria-hidden="true"
            />
            <span className={styles.brandName}>{messages.common.appName}</span>
          </h1>
          <div className={heroNoteClassName}>
            <p className={styles.heroText}>{heroCopy.text}</p>
          </div>
        </div>
        <div className={styles.headerControls}>
          <div
            className={styles.languageSwitcher}
            role="group"
            aria-label={messages.settings.sections.language.label}
          >
            {APP_LOCALES.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.languageButton}${
                  locale === option ? ` ${styles.languageButtonActive}` : ''
                }`}
                onClick={() => handleLanguageChange(option)}
                aria-pressed={locale === option}
              >
                {messages.settings.sections.language.options[option]}
              </button>
            ))}
          </div>

          <button
            ref={settingsButtonRef}
            type="button"
            className={styles.settingsButton}
            onClick={handleOpenSettings}
            aria-label={messages.home.openSettingsAria}
            title={messages.home.settings}
          >
            <svg
              className={styles.settingsIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <circle
                cx="9"
                cy="6"
                r="2.2"
                fill="currentColor"
              />
              <circle
                cx="15"
                cy="12"
                r="2.2"
                fill="currentColor"
              />
              <circle
                cx="11"
                cy="18"
                r="2.2"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.mapShell}>
          <MapView
            className={styles.map}
            theme="light"
            isLoading={session.status === 'loading'}
            cachedLocations={session.cachedMarkers}
            canPreview={
              session.hasConfiguredApiKey === true && session.status !== 'loading'
            }
            onCoordinateSelect={handleCoordinateSelect}
            onMarkerSelect={handleMarkerSelect}
            onHoverPreview={handleHoverPreview}
            onHoverEnd={session.handleHoverEnd}
          />
        </section>
      </main>

      <section className={styles.favoritesBar}>
        <div className={styles.favoritesHeader}>
          <p className={styles.cardEyebrow}>{messages.home.favorites}</p>
          <span className={styles.favoritesCount}>{session.favoriteEntries.length}</span>
        </div>
        <div className={styles.favoriteList}>
          {session.favoriteEntries.length === 0 ? (
            <p className={styles.emptyFavorites}>
              {messages.home.emptyFavorites}
            </p>
          ) : (
            session.favoriteEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={styles.favoriteChip}
                onClick={() => handleFavoriteSelect(entry.id)}
              >
                {messages.home.favoriteLabel(
                  entry.cityName,
                  messages.enums.timeSlots[entry.timeSlot]
                )}
              </button>
            ))
          )}
        </div>
      </section>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
}
