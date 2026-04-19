'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import type { LayerType, AudioBlobMap, PlaybackStateInfo } from '@/utils/audio/types';
import type { LocationContext } from '@/types/locationContext';
import type { SoundscapeRecipe } from '@/types/soundscapeRecipe';
import type { CachedSoundscape } from '@/utils/soundscapeCache';
import type { UserPreferences } from '@/components/settings/types';
import {
  PREFERENCES_UPDATED_EVENT,
  preferencesStore,
} from '@/components/settings/preferencesStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveLocation } from '@/utils/geocoding';
import { generateRecipe } from '@/utils/soundscape';
import {
  generateAmbientPreviewAudio,
  generateDynamicEventAudio,
  generateSoundscapeAudio,
} from '@/utils/elevenLabsClient';
import {
  cacheSoundscape,
  getCachedMarkers,
  getCachedSoundscape,
  updatePlayStats,
} from '@/utils/soundscapeCache';
import { addLocationHistory } from '@/utils/locationHistory';
import {
  addFavorite,
  isFavorite,
  loadFavorites,
  removeFavorite,
} from '@/utils/favoritesStore';
import { generateCacheKey } from '@/utils/cacheKey';
import { hasApiKey } from '@/utils/apiHeaders';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

type SessionStatusMessageKey =
  | 'idleLocation'
  | 'currentLocation'
  | 'apiKeyRequiredStatus'
  | 'generating'
  | 'generationFailed'
  | 'readyToPlay'
  | 'cacheMissingStatus';

type SessionErrorMessageKey =
  | 'apiKeyRequiredError'
  | 'noAudioLayers'
  | 'cacheMissing'
  | null;

const INITIAL_PLAYBACK_STATE: PlaybackStateInfo = {
  state: 'idle',
  soundscapeId: null,
  loadedLayers: [],
  failedLayers: [],
  errorMessage: null,
};

function createDefaultPreferences(): UserPreferences {
  return preferencesStore.getDefaultPreferences();
}

function coerceRecipe(recipe: unknown): SoundscapeRecipe | null {
  if (!recipe || typeof recipe !== 'object') {
    return null;
  }

  const candidate = recipe as Partial<SoundscapeRecipe>;
  if (
    typeof candidate.id !== 'string' ||
    !candidate.location ||
    !candidate.layers ||
    !candidate.timeInterpolation
  ) {
    return null;
  }

  return candidate as SoundscapeRecipe;
}

function getSoundscapeSizeBytes(blobs: AudioBlobMap): number {
  return Object.values(blobs).reduce((total, blob) => total + (blob?.size ?? 0), 0);
}

function isWithinPreviewWindow(
  previous: [number, number] | null,
  next: [number, number]
): boolean {
  if (!previous) {
    return false;
  }

  return (
    Math.abs(previous[0] - next[0]) <= 5 &&
    Math.abs(previous[1] - next[1]) <= 5
  );
}

export interface UseSoundscapeSessionResult {
  status: SessionStatus;
  statusMessage: string;
  errorMessage: string | null;
  currentLocation: LocationContext | null;
  currentRecipe: SoundscapeRecipe | null;
  currentCacheKey: string | null;
  currentAudioBlobs: AudioBlobMap | null;
  sceneDescription: string;
  locationLabel: string;
  cachedMarkers: CachedSoundscape[];
  favoriteEntries: CachedSoundscape[];
  favoriteIds: string[];
  isCurrentFavorite: boolean;
  hasConfiguredApiKey: boolean | null;
  preferences: UserPreferences;
  playbackState: PlaybackStateInfo;
  isAudioSupported: boolean | null;
  handleCoordinateSelect: (lat: number, lng: number) => Promise<void>;
  handleMarkerSelect: (cacheKey: string) => Promise<void>;
  handleFavoriteSelect: (cacheKey: string) => Promise<void>;
  handleHoverPreview: (lat: number, lng: number) => Promise<void>;
  handleHoverEnd: () => void;
  regenerateCurrent: () => Promise<void>;
  toggleFavoriteForCurrent: () => void;
  playCurrent: () => Promise<void>;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  setMasterVolume: (volume: number) => void;
  setLayerVolume: (layerType: LayerType, volume: number) => void;
}

export function useSoundscapeSession(): UseSoundscapeSessionResult {
  const { messages } = useI18n();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [statusMessageKey, setStatusMessageKey] =
    useState<SessionStatusMessageKey>('idleLocation');
  const [errorMessageKey, setErrorMessageKey] =
    useState<SessionErrorMessageKey>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationContext | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<SoundscapeRecipe | null>(null);
  const [currentCacheKey, setCurrentCacheKey] = useState<string | null>(null);
  const [currentAudioBlobs, setCurrentAudioBlobs] = useState<AudioBlobMap | null>(null);
  const [cachedMarkers, setCachedMarkers] = useState<CachedSoundscape[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(createDefaultPreferences);
  const [hasConfiguredApiKey, setHasConfiguredApiKey] = useState<boolean | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewFadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRequestIdRef = useRef(0);
  const lastPreviewCoordsRef = useRef<[number, number] | null>(null);

  const {
    playbackState,
    play,
    pause,
    resume,
    stop,
    setMasterVolume,
    setLayerVolume,
    setFadeInDuration,
    setDynamicEventsEnabled,
    enableAudio,
    isSupported,
  } = useAudioPlayer(generateDynamicEventAudio);

  const refreshCaches = useCallback(async (): Promise<void> => {
    const markers = await getCachedMarkers();
    setCachedMarkers(markers);
    setFavoriteIds(loadFavorites());
  }, []);

  const syncBrowserSettings = useCallback((): void => {
    setPreferences(preferencesStore.loadPreferences());
    setHasConfiguredApiKey(hasApiKey());
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCaches();
    }, 0);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshCaches]);

  useEffect(() => {
    const syncSettingsTimer = window.setTimeout(() => {
      syncBrowserSettings();
    }, 0);

    return (): void => {
      window.clearTimeout(syncSettingsTimer);
    };
  }, [syncBrowserSettings]);

  useEffect(() => {
    const handlePreferenceUpdate = (): void => {
      syncBrowserSettings();
    };

    const handleStorage = (event: StorageEvent): void => {
      if (event.key == null || event.key === 'pindrop_preferences' || event.key === 'pindrop_api_key') {
        syncBrowserSettings();
      }
    };

    window.addEventListener(PREFERENCES_UPDATED_EVENT, handlePreferenceUpdate);
    window.addEventListener('storage', handleStorage);

    return (): void => {
      window.removeEventListener(PREFERENCES_UPDATED_EVENT, handlePreferenceUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncBrowserSettings]);

  useEffect(() => {
    setFadeInDuration(preferences.fadeInDuration);
    setDynamicEventsEnabled(preferences.dynamicEvents);
    setMasterVolume(preferences.masterVolume);

    const layerVolumes = preferences.layerVolumes;
    const layerTypes: LayerType[] = [
      'ambient',
      'signature',
      'dialogue',
      'secondaryDialogue',
      'atmosphere',
    ];

    for (const layerType of layerTypes) {
      setLayerVolume(layerType, layerVolumes[layerType]);
    }
  }, [
    preferences,
    setDynamicEventsEnabled,
    setFadeInDuration,
    setLayerVolume,
    setMasterVolume,
  ]);

  const disposePreviewImmediately = useCallback((): void => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
      previewAudioRef.current = null;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const cleanupPreview = useCallback((fadeOut = false): void => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    if (previewFadeIntervalRef.current) {
      clearInterval(previewFadeIntervalRef.current);
      previewFadeIntervalRef.current = null;
    }

    const audio = previewAudioRef.current;
    if (!audio) {
      disposePreviewImmediately();
      return;
    }

    if (!fadeOut) {
      disposePreviewImmediately();
      return;
    }

    previewFadeIntervalRef.current = setInterval(() => {
      if (!previewAudioRef.current) {
        return;
      }

      const nextVolume = Math.max(0, previewAudioRef.current.volume - 0.12);
      previewAudioRef.current.volume = nextVolume;
      if (nextVolume === 0) {
        disposePreviewImmediately();
      }
    }, 60);
  }, [disposePreviewImmediately]);

  useEffect(() => {
    return (): void => {
      cleanupPreview(false);
    };
  }, [cleanupPreview]);

  const recordSuccessfulPlayback = useCallback(async (
    cacheKey: string,
    recipe: SoundscapeRecipe
  ): Promise<void> => {
    await updatePlayStats(cacheKey);
    await addLocationHistory(recipe.location.coordinates, cacheKey);
    await refreshCaches();
  }, [refreshCaches]);

  const applySoundscapeState = useCallback(
    (
      cacheKey: string,
      recipe: SoundscapeRecipe,
      blobs: AudioBlobMap
    ): void => {
      cleanupPreview(false);
      setCurrentCacheKey(cacheKey);
      setCurrentRecipe(recipe);
      setCurrentLocation(recipe.location);
      setCurrentAudioBlobs(blobs);
      setErrorMessageKey(null);
      setStatus('ready');
      setStatusMessageKey('currentLocation');
    },
    [cleanupPreview]
  );

  const playCurrent = useCallback(async (): Promise<void> => {
    if (!currentRecipe || !currentAudioBlobs || !currentCacheKey) {
      return;
    }

    await enableAudio();
    await play(currentRecipe, currentAudioBlobs);
    await recordSuccessfulPlayback(currentCacheKey, currentRecipe);
  }, [currentAudioBlobs, currentCacheKey, currentRecipe, enableAudio, play, recordSuccessfulPlayback]);

  const hydrateFromCache = useCallback(
    async (cacheKey: string, shouldAutoPlay: boolean): Promise<boolean> => {
      const cached = await getCachedSoundscape(cacheKey);
      const recipe = coerceRecipe(cached?.recipe);
      if (!cached || !recipe || !cached.audioBlobs) {
        return false;
      }

      const blobs = cached.audioBlobs as AudioBlobMap;
      applySoundscapeState(cacheKey, recipe, blobs);

      if (shouldAutoPlay) {
        await enableAudio();
        await play(recipe, blobs);
        await recordSuccessfulPlayback(cacheKey, recipe);
      }

      return true;
    },
    [applySoundscapeState, enableAudio, play, recordSuccessfulPlayback]
  );

  const buildAndStoreSoundscape = useCallback(
    async (
      lat: number,
      lng: number,
      shouldAutoPlay: boolean,
      forceRefresh: boolean
    ): Promise<void> => {
      if (!hasApiKey()) {
        setStatus('error');
        setErrorMessageKey('apiKeyRequiredError');
        setStatusMessageKey('apiKeyRequiredStatus');
        return;
      }

      setStatus('loading');
      setErrorMessageKey(null);
      setStatusMessageKey('generating');

      const location = await resolveLocation(lat, lng);
      const cacheKey = generateCacheKey(lat, lng, location.currentLocalHour);

      if (!forceRefresh) {
        const cacheHit = await hydrateFromCache(cacheKey, shouldAutoPlay);
        if (cacheHit) {
          return;
        }
      }

      const recipe = generateRecipe(location);
      const generatedAudio = await generateSoundscapeAudio(recipe);

      const blobs = generatedAudio.blobs;
      if (Object.keys(blobs).length === 0) {
        setStatus('error');
        setErrorMessageKey('noAudioLayers');
        setStatusMessageKey('generationFailed');
        return;
      }

      applySoundscapeState(cacheKey, recipe, blobs);

      await cacheSoundscape(cacheKey, {
        coordinates: recipe.location.coordinates,
        timeSlot: recipe.location.timeSlot,
        cityName: recipe.location.cityName,
        countryName: recipe.location.countryName,
        generatedAt: recipe.generatedAt,
        playCount: 0,
        lastPlayedAt: recipe.generatedAt,
        sizeBytes: getSoundscapeSizeBytes(blobs),
        audioBlobs: blobs,
        recipe,
      });
      await refreshCaches();

      if (shouldAutoPlay) {
        await enableAudio();
        await play(recipe, blobs);
        await recordSuccessfulPlayback(cacheKey, recipe);
      } else {
        setStatusMessageKey('readyToPlay');
      }
    },
    [
      applySoundscapeState,
      enableAudio,
      hydrateFromCache,
      play,
      recordSuccessfulPlayback,
      refreshCaches,
    ]
  );

  const handleCoordinateSelect = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      await buildAndStoreSoundscape(lat, lng, preferences.autoPlay, false);
    },
    [buildAndStoreSoundscape, preferences.autoPlay]
  );

  const handleMarkerSelect = useCallback(
    async (cacheKey: string): Promise<void> => {
      const cacheHit = await hydrateFromCache(cacheKey, true);
      if (!cacheHit) {
        setStatus('error');
        setErrorMessageKey('cacheMissing');
        setStatusMessageKey('cacheMissingStatus');
        await refreshCaches();
      }
    },
    [hydrateFromCache, refreshCaches]
  );

  const handleFavoriteSelect = useCallback(
    async (cacheKey: string): Promise<void> => {
      await handleMarkerSelect(cacheKey);
    },
    [handleMarkerSelect]
  );

  const regenerateCurrent = useCallback(async (): Promise<void> => {
    if (!currentLocation) {
      return;
    }

    await buildAndStoreSoundscape(
      currentLocation.coordinates[0],
      currentLocation.coordinates[1],
      preferences.autoPlay,
      true
    );
  }, [buildAndStoreSoundscape, currentLocation, preferences.autoPlay]);

  const toggleFavoriteForCurrent = useCallback((): void => {
    if (!currentCacheKey) {
      return;
    }

    if (isFavorite(currentCacheKey)) {
      removeFavorite(currentCacheKey);
    } else {
      addFavorite(currentCacheKey);
    }

    setFavoriteIds(loadFavorites());
  }, [currentCacheKey]);

  const handleHoverPreview = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      if (!hasApiKey() || status === 'loading') {
        return;
      }

      const nextCoords: [number, number] = [lat, lng];
      if (isWithinPreviewWindow(lastPreviewCoordsRef.current, nextCoords)) {
        return;
      }

      lastPreviewCoordsRef.current = nextCoords;
      const requestId = ++previewRequestIdRef.current;

      try {
        const location = await resolveLocation(lat, lng);
        if (previewRequestIdRef.current !== requestId) {
          return;
        }

        const recipe = generateRecipe(location);
        const previewBlob = await generateAmbientPreviewAudio(recipe.layers.ambient.prompt);
        if (previewRequestIdRef.current !== requestId) {
          return;
        }

        cleanupPreview(false);
        const previewUrl = URL.createObjectURL(previewBlob);
        const audio = new Audio(previewUrl);
        audio.volume = 0.18;
        previewUrlRef.current = previewUrl;
        previewAudioRef.current = audio;
        await audio.play();

        previewTimeoutRef.current = setTimeout(() => {
          cleanupPreview(true);
        }, 2000);
      } catch {
        // Preview is intentionally best-effort only.
      }
    },
    [cleanupPreview, status]
  );

  const handleHoverEnd = useCallback((): void => {
    cleanupPreview(true);
  }, [cleanupPreview]);

  const favoriteEntries = useMemo(() => {
    const favoriteKeySet = new Set(favoriteIds);
    return cachedMarkers.filter((marker) => favoriteKeySet.has(marker.id));
  }, [cachedMarkers, favoriteIds]);

  const effectiveStatus: SessionStatus =
    playbackState.state === 'error'
      ? 'error'
      : playbackState.state === 'playing' || playbackState.state === 'paused'
        ? 'ready'
        : status;

  const effectiveErrorMessage =
    playbackState.state === 'error'
      ? messages.session.playbackFailed
      : errorMessageKey
        ? messages.session[errorMessageKey]
        : null;

  const locationLabel = useMemo(() => {
    if (!currentLocation) {
      return messages.session.idleLocation;
    }

    return messages.session.locationLabel(
      currentLocation.cityName,
      currentLocation.countryName
    );
  }, [currentLocation, messages]);

  const sceneDescription = useMemo(() => {
    if (!currentLocation) {
      return messages.session.idleScene;
    }

    return messages.session.sceneDescription(
      messages.enums.timeSlots[currentLocation.timeSlot],
      messages.enums.regions[currentLocation.regionType],
      messages.enums.climates[currentLocation.climate]
    );
  }, [currentLocation, messages]);

  const effectiveStatusMessage = useMemo(() => {
    if (playbackState.state === 'playing' || playbackState.state === 'paused') {
      return locationLabel;
    }

    if (statusMessageKey === 'currentLocation') {
      return locationLabel;
    }

    return messages.session[statusMessageKey];
  }, [locationLabel, messages, playbackState.state, statusMessageKey]);

  return {
    status: effectiveStatus,
    statusMessage: effectiveStatusMessage,
    errorMessage: effectiveErrorMessage,
    currentLocation,
    currentRecipe,
    currentCacheKey,
    currentAudioBlobs,
    sceneDescription,
    locationLabel,
    cachedMarkers,
    favoriteEntries,
    favoriteIds,
    isCurrentFavorite: currentCacheKey ? isFavorite(currentCacheKey) : false,
    hasConfiguredApiKey,
    preferences,
    playbackState: playbackState ?? INITIAL_PLAYBACK_STATE,
    isAudioSupported: isSupported,
    handleCoordinateSelect,
    handleMarkerSelect,
    handleFavoriteSelect,
    handleHoverPreview,
    handleHoverEnd,
    regenerateCurrent,
    toggleFavoriteForCurrent,
    playCurrent,
    pausePlayback: pause,
    resumePlayback: resume,
    stopPlayback: stop,
    setMasterVolume,
    setLayerVolume,
  };
}
