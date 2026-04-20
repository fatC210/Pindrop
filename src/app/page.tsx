'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import Image from 'next/image';

import { SettingsPanel } from '@/components/settings';
import { preferencesStore } from '@/components/settings/preferencesStore';
import {
  useSoundscapeSession,
  type SessionLocationEntry,
} from '@/hooks/useSoundscapeSession';
import { useI18n } from '@/i18n/I18nProvider';
import { APP_LOCALES, type AppLocale } from '@/i18n/types';
import type { LocalizedPlaceName } from '@/utils/nominatim';
import { useLocalizedLocationLabels } from './useLocalizedLocationLabels';
import styles from './page.module.css';

const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => ({ default: mod.MapView })),
  { ssr: false }
);

function joinLocationParts(parts: Array<string | undefined>, locale: AppLocale): string {
  const uniqueParts: string[] = [];

  for (const part of parts) {
    const normalized = part?.trim();
    if (!normalized || uniqueParts.includes(normalized)) {
      continue;
    }

    uniqueParts.push(normalized);
  }

  return uniqueParts.join(locale === 'zh-CN' ? '，' : ', ');
}

function formatLocationTitle(
  entry: Pick<SessionLocationEntry, 'cityName' | 'regionName' | 'countryName'>,
  localizedLabel: LocalizedPlaceName | undefined,
  locale: AppLocale
): string {
  const regionName = localizedLabel?.regionName ?? entry.regionName;
  const cityName = localizedLabel?.cityName ?? entry.cityName;
  const countryName = localizedLabel?.countryName ?? entry.countryName;

  return joinLocationParts([regionName, cityName, countryName], locale);
}

export default function Home(): React.JSX.Element {
  const { locale, messages, setLocale } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusedCoordinates, setFocusedCoordinates] = useState<[number, number] | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const session = useSoundscapeSession();
  const shouldShowApiKeyPrompt = session.hasConfiguredApiKey === false;
  const visibleLocationEntries = shouldShowApiKeyPrompt
    ? session.locationEntries.filter((entry) => entry.status !== 'ready')
    : session.locationEntries;
  const visibleMapPins = shouldShowApiKeyPrompt
    ? session.mapPins.filter((pin) => pin.isGenerating)
    : session.mapPins;
  const localizedLocationLabels = useLocalizedLocationLabels(visibleLocationEntries, locale);
  const generatedPlacesLabel = locale === 'zh-CN' ? '已生成地点' : 'Generated places';
  const emptyGeneratedPlacesLabel =
    locale === 'zh-CN'
      ? '点击地图后，生成中的地点和已完成的声音地点都会出现在这里。'
      : 'Places you generate from the map appear here with progress and playback controls.';
  const locatingLabel = locale === 'zh-CN' ? '定位中' : 'Locating';
  const generatingLabel = locale === 'zh-CN' ? '生成中' : 'Generating';
  const failedLabel = locale === 'zh-CN' ? '生成失败' : 'Failed';
  const pendingLocationLabel = locale === 'zh-CN' ? '待识别地点' : 'Pending location';

  const handleToggleSettings = useCallback((): void => {
    setIsSettingsOpen((current) => !current);
  }, []);

  const handleOpenSettings = useCallback((): void => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback((): void => {
    setIsSettingsOpen(false);
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const settingsButton = settingsButtonRef.current;
      const settingsMenu = settingsMenuRef.current;
      const clickedButton = settingsButton?.contains(target) ?? false;
      const clickedMenu = settingsMenu?.contains(target) ?? false;

      if (!clickedButton && !clickedMenu) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return (): void => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isSettingsOpen]);

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

  const handleCoordinateSelect = useCallback(
    (lat: number, lng: number): void => {
      void session.handleCoordinateSelect(lat, lng);
    },
    [session]
  );

  const handleMarkerSelect = useCallback(
    (cacheKey: string): void => {
      void session.handleMarkerSelect(cacheKey);
    },
    [session]
  );

  const handleLocationFocus = useCallback((coordinates: [number, number]): void => {
    setFocusedCoordinates([coordinates[0], coordinates[1]]);
  }, []);

  const handleHoverPreview = useCallback(
    (lat: number, lng: number): void => {
      void session.handleHoverPreview(lat, lng);
    },
    [session]
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandLockup}>
          <Image
            className={styles.brandLogo}
            src="/pindrop-logo.svg"
            alt=""
            width={96}
            height={96}
            priority
            aria-hidden="true"
          />
          <span className={styles.brandName}>{messages.common.appName}</span>
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

          <div className={styles.settingsMenuAnchor} ref={settingsMenuRef}>
            <button
              ref={settingsButtonRef}
              type="button"
              className={styles.settingsButton}
              onClick={handleToggleSettings}
              aria-label={messages.home.openSettingsAria}
              aria-expanded={isSettingsOpen}
              aria-haspopup="dialog"
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

            <SettingsPanel
              isOpen={isSettingsOpen}
              onClose={handleCloseSettings}
              anchorRef={settingsButtonRef}
            />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.mapShell}>
          <MapView
            className={styles.map}
            theme="light"
            markers={visibleMapPins}
            focusedCoordinates={focusedCoordinates}
            canPreview={
              session.hasConfiguredApiKey === true && session.hasActiveGeneration === false
            }
            onCoordinateSelect={handleCoordinateSelect}
            onMarkerSelect={handleMarkerSelect}
            onHoverPreview={handleHoverPreview}
            onHoverEnd={session.handleHoverEnd}
          />
        </section>

        <aside className={styles.locationsBar}>
          <div className={styles.locationsHeader}>
            <p className={styles.sectionLabel}>{generatedPlacesLabel}</p>
            {visibleLocationEntries.length > 0 ? (
              <span className={styles.locationsCount}>{visibleLocationEntries.length}</span>
            ) : null}
          </div>

          {shouldShowApiKeyPrompt ? (
            <section className={styles.apiKeyNotice} aria-live="polite">
              <div className={styles.apiKeyNoticeCopy}>
                <p className={styles.apiKeyNoticeTitle}>{messages.home.apiKeyRequiredTitle}</p>
                <p className={styles.apiKeyNoticeText}>{messages.home.apiKeyRequiredCopy}</p>
              </div>
              <button
                type="button"
                className={styles.apiKeyNoticeButton}
                onClick={handleOpenSettings}
                aria-label={messages.home.openSettingsAria}
              >
                {messages.home.settings}
              </button>
            </section>
          ) : null}

          <div className={styles.locationList}>
            {visibleLocationEntries.length === 0 ? (
              shouldShowApiKeyPrompt ? null : (
                <p className={styles.emptyLocations}>{emptyGeneratedPlacesLabel}</p>
              )
            ) : (
              visibleLocationEntries.map((entry) => {
                const isActiveLocation =
                  entry.cacheKey !== null &&
                  session.activePlaybackLocationId === entry.cacheKey &&
                  (session.playbackState.state === 'playing' ||
                    session.playbackState.state === 'paused');
                const isReadyEntry = entry.status === 'ready';
                const isPlayingLocation =
                  isActiveLocation && session.playbackState.state === 'playing';
                const isPausedLocation =
                  isActiveLocation && session.playbackState.state === 'paused';

                const localizedLabel = localizedLocationLabels[entry.id];
                const title = formatLocationTitle(entry, localizedLabel, locale);

                const statusLabel =
                  entry.status === 'error'
                    ? failedLabel
                    : entry.status === 'loading' && entry.progress < 30
                      ? locatingLabel
                      : entry.status === 'loading'
                        ? generatingLabel
                        : entry.statusLabel;
                const clampedProgress = Math.max(0, Math.min(100, entry.progress));
                const isProgressComplete = clampedProgress >= 100;
                const playbackButtonLabel = isPlayingLocation
                  ? messages.home.actions.pause
                  : isPausedLocation
                    ? messages.home.actions.resume
                    : messages.home.actions.play;

                return (
                  <article
                    key={entry.id}
                    className={`${styles.locationCard}${
                      entry.status === 'error'
                        ? ` ${styles.locationCardError}`
                        : isActiveLocation
                          ? ` ${styles.locationCardActive}`
                          : ''
                    }`}
                    onClick={() => handleLocationFocus(entry.coordinates)}
                  >
                    <div className={styles.locationCardHeader}>
                      <div className={styles.locationTitleGroup}>
                        <h2 className={styles.locationTitle}>{title}</h2>
                        <p className={styles.locationMeta}>
                          {entry.sceneDescription ??
                            (entry.timeSlot
                              ? messages.enums.timeSlots[entry.timeSlot]
                              : pendingLocationLabel)}
                        </p>
                        {entry.soundDescription ? (
                          <p className={styles.locationSound}>{entry.soundDescription}</p>
                        ) : null}
                      </div>

                      <span
                        className={`${styles.locationStatus}${
                          entry.status === 'error'
                            ? ` ${styles.locationStatusError}`
                            : entry.status === 'ready'
                              ? ` ${styles.locationStatusReady}`
                              : ` ${styles.locationStatusLoading}`
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {!isReadyEntry ? (
                      <div className={styles.progressRow}>
                        <div className={styles.progressTrack}>
                          <span
                            className={`${styles.progressFill}${
                              entry.status === 'error' ? ` ${styles.progressFillError}` : ''
                            }${isProgressComplete ? ` ${styles.progressFillComplete}` : ''}`}
                            style={{ width: `${clampedProgress}%` }}
                          />
                        </div>
                        <span className={styles.progressValue}>{clampedProgress}%</span>
                      </div>
                    ) : (
                      <div className={styles.playbackRow}>
                        <div
                          className={`${styles.waveform}${
                            isActiveLocation ? ` ${styles.waveformVisible}` : ''
                          }${isPlayingLocation ? ` ${styles.waveformActive}` : ''}`}
                          aria-hidden="true"
                          data-testid={`waveform-${entry.id}`}
                        >
                          <span className={styles.waveformBar} />
                          <span className={styles.waveformBar} />
                          <span className={styles.waveformBar} />
                          <span className={styles.waveformBar} />
                        </div>
                        <button
                          type="button"
                          className={styles.playbackIconButton}
                          aria-label={playbackButtonLabel}
                          title={playbackButtonLabel}
                          onClick={() => {
                            if (!entry.cacheKey) {
                              return;
                            }

                            if (isPlayingLocation) {
                              session.pausePlayback();
                              return;
                            }

                            if (isPausedLocation) {
                              session.resumePlayback();
                              return;
                            }

                            void session.handleLocationSelect(entry.cacheKey);
                          }}
                        >
                          {isPlayingLocation ? (
                            <svg
                              className={styles.playbackIcon}
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                d="M8 6.5C8 5.67 8.67 5 9.5 5S11 5.67 11 6.5v11c0 .83-.67 1.5-1.5 1.5S8 18.33 8 17.5zm5 0c0-.83.67-1.5 1.5-1.5S16 5.67 16 6.5v11c0 .83-.67 1.5-1.5 1.5S13 18.33 13 17.5z"
                                fill="currentColor"
                              />
                            </svg>
                          ) : (
                            <svg
                              className={styles.playbackIcon}
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                d="M8.72 5.55c-.96-.59-2.22.1-2.22 1.23v10.44c0 1.14 1.26 1.82 2.22 1.24l8.46-5.22c.92-.56.92-1.91 0-2.47z"
                                fill="currentColor"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}

                    {!isReadyEntry ? (
                      <div className={styles.locationActions}>
                        <button
                          type="button"
                          className={styles.locationActionPrimary}
                          disabled={!entry.isPlayable}
                          onClick={() => {
                            if (!entry.isPlayable || !entry.cacheKey) {
                              return;
                            }

                            void session.handleLocationSelect(entry.cacheKey);
                          }}
                        >
                          {statusLabel}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
