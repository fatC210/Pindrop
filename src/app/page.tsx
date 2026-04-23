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
const PLAYBACK_WAVE_SEGMENTS = Array.from({ length: 18 }, (_, index) => index);

function joinLocationParts(parts: Array<string | undefined>, locale: AppLocale): string {
  const uniqueParts: string[] = [];

  for (const part of parts) {
    const normalized = part?.trim();
    if (!normalized || uniqueParts.includes(normalized)) {
      continue;
    }

    uniqueParts.push(normalized);
  }

  const separator = locale === 'zh-CN' ? '\uFF0C' : ', ';
  return uniqueParts.join(separator);
}

function formatLocationTitle(
  entry: Pick<
    SessionLocationEntry,
    'administrativeRegionName' | 'cityName' | 'regionName' | 'countryName'
  >,
  localizedLabel: LocalizedPlaceName | undefined,
  locale: AppLocale
): string {
  const administrativeRegionName =
    localizedLabel?.administrativeRegionName ?? entry.administrativeRegionName;
  const cityName = localizedLabel?.cityName ?? entry.cityName;
  const regionName = localizedLabel?.regionName ?? entry.regionName;
  const countryName = localizedLabel?.countryName ?? entry.countryName;
  const orderedParts =
    locale === 'zh-CN'
      ? [countryName, administrativeRegionName, cityName, regionName]
      : [regionName, cityName, administrativeRegionName, countryName];

  return joinLocationParts(orderedParts, locale);
}

export default function Home(): React.JSX.Element {
  const { locale, messages, setLocale } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusedCoordinates, setFocusedCoordinates] = useState<[number, number] | null>(null);
  const [pendingListFocusLocationId, setPendingListFocusLocationId] = useState<string | null>(null);
  const [mapFocusedLocationId, setMapFocusedLocationId] = useState<string | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const locationCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const mapFocusResetTimeoutRef = useRef<number | null>(null);
  const session = useSoundscapeSession();
  const shouldShowGenerationSetupPrompt = session.hasConfiguredApiKey === false;
  const visibleLocationEntries = shouldShowGenerationSetupPrompt
    ? session.locationEntries.filter((entry) => entry.status !== 'ready')
    : session.locationEntries;
  const visibleMapPins = shouldShowGenerationSetupPrompt
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

  const emptyGeneratedPlacesTitle = locale === 'zh-CN' ? '还没有生成任务' : 'No places yet';

  void emptyGeneratedPlacesTitle;

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

  useEffect(() => {
    if (!pendingListFocusLocationId) {
      return;
    }

    const targetCard = locationCardRefs.current[pendingListFocusLocationId];
    if (!targetCard) {
      return;
    }

    targetCard.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    targetCard.focus({ preventScroll: true });
    setPendingListFocusLocationId(null);
  }, [pendingListFocusLocationId, visibleLocationEntries]);

  useEffect(() => {
    return (): void => {
      if (mapFocusResetTimeoutRef.current !== null) {
        window.clearTimeout(mapFocusResetTimeoutRef.current);
      }
    };
  }, []);

  const highlightLocationFromMap = useCallback((locationId: string): void => {
    setMapFocusedLocationId(locationId);

    if (mapFocusResetTimeoutRef.current !== null) {
      window.clearTimeout(mapFocusResetTimeoutRef.current);
    }

    mapFocusResetTimeoutRef.current = window.setTimeout(() => {
      setMapFocusedLocationId((current) => (current === locationId ? null : current));
      mapFocusResetTimeoutRef.current = null;
    }, 1800);
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

  const handleCoordinateSelect = useCallback(
    (lat: number, lng: number): void => {
      setMapFocusedLocationId(null);
      setFocusedCoordinates([lat, lng]);
      void session.handleCoordinateSelect(lat, lng);
    },
    [session]
  );

  const handleMarkerSelect = useCallback(
    (cacheKey: string): void => {
      const matchingEntry = visibleLocationEntries.find((entry) => entry.cacheKey === cacheKey);
      if (matchingEntry) {
        setFocusedCoordinates([matchingEntry.coordinates[0], matchingEntry.coordinates[1]]);
        setPendingListFocusLocationId(matchingEntry.id);
        highlightLocationFromMap(matchingEntry.id);
      }

      void session.handleLocationSelect(cacheKey);
    },
    [highlightLocationFromMap, session, visibleLocationEntries]
  );

  const handleLocationFocus = useCallback((entry: SessionLocationEntry): void => {
    setMapFocusedLocationId(null);
    setFocusedCoordinates([entry.coordinates[0], entry.coordinates[1]]);
  }, []);

  const handleLocationDelete = useCallback(
    (entry: Pick<SessionLocationEntry, 'id' | 'cacheKey' | 'status'>): void => {
      void session.deleteLocationEntry(entry);
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
            onCoordinateSelect={handleCoordinateSelect}
            onMarkerSelect={handleMarkerSelect}
          />
        </section>

        <aside className={styles.locationsBar}>
          <div className={styles.locationsHeader}>
            <p className={styles.sectionLabel}>{generatedPlacesLabel}</p>
            {visibleLocationEntries.length > 0 ? (
              <span className={styles.locationsCount}>{visibleLocationEntries.length}</span>
            ) : null}
          </div>

          {shouldShowGenerationSetupPrompt ? (
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

          <div
            className={`${styles.locationList}${
              visibleLocationEntries.length === 0 && !shouldShowGenerationSetupPrompt
                ? ` ${styles.locationListEmpty}`
                : ''
            }`}
          >
            {visibleLocationEntries.length === 0 ? (
              shouldShowGenerationSetupPrompt ? null : (
                <div className={styles.emptyLocations} role="status" aria-live="polite">
                  <div className={styles.emptyLocationsIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        d="M12 3.5a5.75 5.75 0 0 1 5.75 5.75c0 4.35-4.44 8.73-5.23 9.47a.75.75 0 0 1-1.04 0c-.79-.74-5.23-5.12-5.23-9.47A5.75 5.75 0 0 1 12 3.5m0 1.5a4.25 4.25 0 0 0-4.25 4.25c0 2.87 2.75 6.12 4.25 7.62 1.5-1.5 4.25-4.75 4.25-7.62A4.25 4.25 0 0 0 12 5m0 2.25a2 2 0 1 1 0 4 2 2 0 0 1 0-4"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <p className={styles.emptyLocationsText}>{emptyGeneratedPlacesLabel}</p>
                </div>
              )
            ) : (
              visibleLocationEntries.map((entry) => {
                const isActiveLocation =
                  entry.cacheKey !== null &&
                  session.activePlaybackLocationId === entry.cacheKey &&
                  (session.playbackState.state === 'playing' ||
                    session.playbackState.state === 'paused');
                const isMapFocusedLocation = mapFocusedLocationId === entry.id;
                const isReadyEntry = entry.status === 'ready';
                const isLoadingEntry = entry.status === 'loading';
                const isPlayingLocation =
                  isActiveLocation && session.playbackState.state === 'playing';
                const isPausedLocation =
                  isActiveLocation && session.playbackState.state === 'paused';

                const displayLocale = entry.displayLocale ?? locale;
                const localizedLabel = localizedLocationLabels[entry.id];
                const title = formatLocationTitle(entry, localizedLabel, displayLocale);

                const statusLabel =
                  entry.status === 'error'
                    ? failedLabel
                    : isLoadingEntry && entry.progress < 30
                      ? locatingLabel
                      : isLoadingEntry
                        ? generatingLabel
                        : entry.statusLabel;
                const playbackButtonLabel = isPlayingLocation
                  ? messages.home.actions.pause
                  : isPausedLocation
                    ? messages.home.actions.resume
                    : messages.home.actions.play;
                const loadingIndicator = (
                  <span className={styles.locationLoadingIndicator} aria-hidden="true">
                    <span className={styles.locationLoadingDot} />
                    <span className={styles.locationLoadingDot} />
                    <span className={styles.locationLoadingDot} />
                  </span>
                );

                return (
                  <article
                    key={entry.id}
                    ref={(node) => {
                      locationCardRefs.current[entry.id] = node;
                    }}
                    tabIndex={-1}
                    data-map-focused={isMapFocusedLocation ? 'true' : 'false'}
                    className={`${styles.locationCard}${
                      entry.status === 'error'
                        ? ` ${styles.locationCardError}`
                        : isActiveLocation
                          ? ` ${styles.locationCardActive}`
                          : ''
                    }${isMapFocusedLocation ? ` ${styles.locationCardMapFocused}` : ''}`}
                    onClick={() => handleLocationFocus(entry)}
                  >
                    <div
                      className={`${styles.locationCardHeader}${
                        entry.sceneDescription ? '' : ` ${styles.locationCardHeaderCentered}`
                      }`}
                    >
                      <div className={styles.locationTitleGroup}>
                        <h2 className={styles.locationTitle}>{title}</h2>
                      </div>

                      <div className={styles.locationHeaderActions}>
                        <span
                          className={`${styles.locationStatus}${
                            entry.status === 'error'
                              ? ` ${styles.locationStatusError}`
                              : entry.status === 'ready'
                                ? ` ${styles.locationStatusReady}`
                                : ` ${styles.locationStatusLoading}`
                          }`}
                          role={isLoadingEntry ? 'status' : undefined}
                          aria-label={isLoadingEntry ? statusLabel : undefined}
                          aria-live={isLoadingEntry ? 'polite' : undefined}
                        >
                          {isLoadingEntry ? loadingIndicator : statusLabel}
                        </span>
                        <button
                          type="button"
                          className={styles.locationDeleteButton}
                          aria-label={messages.home.actions.delete}
                          title={messages.home.actions.delete}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleLocationDelete(entry);
                          }}
                        >
                          <svg
                            className={styles.locationDeleteIcon}
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path
                              d="M9.5 4.75h5a1.5 1.5 0 0 1 1.5 1.5V7h2a.75.75 0 0 1 0 1.5h-.62l-.7 9.18A2.25 2.25 0 0 1 14.44 20H9.56a2.25 2.25 0 0 1-2.24-2.32l-.7-9.18H6a.75.75 0 0 1 0-1.5h2v-.75a1.5 1.5 0 0 1 1.5-1.5m0 1.5V7h5v-.75zm-1.37 2.25.68 9.07a.75.75 0 0 0 .75.68h4.88a.75.75 0 0 0 .75-.68l.68-9.07zm2.37 2a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75m3 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {entry.sceneDescription ? (
                      <p className={styles.locationMeta}>{entry.sceneDescription}</p>
                    ) : null}

                    {entry.fallbackNotice ? (
                      <p className={styles.locationFallbackNotice}>{entry.fallbackNotice}</p>
                    ) : null}

                    {isReadyEntry ? (
                      <div className={styles.playbackRow}>
                        <button
                          type="button"
                          className={styles.playbackIconButton}
                          aria-label={playbackButtonLabel}
                          title={playbackButtonLabel}
                          onClick={(event) => {
                            event.stopPropagation();
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
                        <div
                          className={`${styles.playbackProgress}${
                            isActiveLocation ? ` ${styles.playbackProgressVisible}` : ''
                          }${isPlayingLocation ? ` ${styles.playbackProgressActive}` : ''}${
                            isPausedLocation ? ` ${styles.playbackProgressPaused}` : ''
                          }`}
                          aria-hidden="true"
                          data-state={
                            isPlayingLocation
                              ? 'playing'
                              : isPausedLocation
                                ? 'paused'
                                : isActiveLocation
                                  ? 'active'
                                  : 'idle'
                          }
                          data-testid={`playback-progress-${entry.id}`}
                        >
                          <span
                            className={styles.playbackProgressFill}
                            data-testid={`playback-progress-fill-${entry.id}`}
                          />
                          {PLAYBACK_WAVE_SEGMENTS.map((segment) => (
                            <span key={segment} className={styles.playbackWaveBar} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!isReadyEntry && !isLoadingEntry && entry.status !== 'error' ? (
                      <div className={styles.locationActions}>
                        <button
                          type="button"
                          className={styles.locationActionPrimary}
                          disabled={!entry.isPlayable}
                          onClick={(event) => {
                            event.stopPropagation();
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
