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
  getLlmEnhancementConfig,
  preferencesStore,
} from '@/components/settings/preferencesStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveLocation } from '@/utils/geocoding';
import { generateRecipe } from '@/utils/soundscape';
import {
  generateAmbientPreviewAudio,
  DEFAULT_RENDER_DURATION_SECONDS,
  generateDynamicEventAudio,
  generateSoundscapeAudio,
} from '@/utils/elevenLabsClient';
import {
  cacheSoundscape,
  deleteCachedSoundscape,
  getCachedMarkers,
  getCachedSoundscape,
  updatePlayStats,
} from '@/utils/soundscapeCache';
import { addLocationHistory } from '@/utils/locationHistory';
import { generateCacheKey } from '@/utils/cacheKey';
import { hasApiKey } from '@/utils/apiHeaders';
import type { TimeSlot } from '@/utils/timeSlot';
import { enrichSoundscapeNarrative } from '@/utils/soundscape/llmAnchorEnricher';
import { getSoundSummary } from '@/utils/soundscape/sceneNarrative';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';
type GenerationJobStatus = 'resolving' | 'generating' | 'error';

const INITIAL_PLAYBACK_STATE: PlaybackStateInfo = {
  state: 'idle',
  soundscapeId: null,
  loadedLayers: [],
  failedLayers: [],
  errorMessage: null,
  playbackPositionSeconds: 0,
  playbackDurationSeconds: 0,
  playbackProgress: 0,
};

interface GenerationJob {
  id: string;
  coordinateToken: string;
  coordinates: [number, number];
  cacheKey: string | null;
  cityName: string | null;
  regionName: string | null;
  countryName: string | null;
  timeSlot: TimeSlot | null;
  createdAt: number;
  progress: number;
  status: GenerationJobStatus;
  errorMessage: string | null;
  locationContext: LocationContext | null;
}

export interface SessionLocationEntry {
  id: string;
  cacheKey: string | null;
  coordinates: [number, number];
  cityName: string;
  regionName?: string;
  countryName: string;
  timeSlot: TimeSlot | null;
  createdAt: number;
  progress: number;
  status: 'loading' | 'ready' | 'error';
  statusLabel: string;
  errorMessage: string | null;
  isPlayable: boolean;
  playbackDurationSeconds?: number;
  sceneDescription?: string;
  soundDescription?: string;
}

export interface SessionMapPin {
  id: string;
  cacheKey: string | null;
  coordinates: [number, number];
  isGenerating: boolean;
  isSelectable: boolean;
}

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

const CONTINUOUS_BED_LAYERS: readonly LayerType[] = ['ambient', 'atmosphere'];
const MIN_CONTINUOUS_BED_DURATION_SECONDS = Math.max(
  8,
  Math.floor(DEFAULT_RENDER_DURATION_SECONDS * 0.35)
);
const AUDIO_METADATA_TIMEOUT_MS = 1500;

function isJsdomRuntime(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /jsdom/i.test(navigator.userAgent);
}

function hasContinuousBedBlob(
  blobs: AudioBlobMap | CachedSoundscape['audioBlobs'] | null | undefined
): boolean {
  if (!blobs) {
    return false;
  }

  return CONTINUOUS_BED_LAYERS.some((layerType) => blobs[layerType] instanceof Blob);
}

async function measureBlobDurationSeconds(blob: Blob): Promise<number | null> {
  if (
    typeof window === 'undefined' ||
    typeof window.Audio !== 'function' ||
    isJsdomRuntime()
  ) {
    return null;
  }

  const objectUrl = URL.createObjectURL(blob);

  try {
    const duration = await new Promise<number | null>((resolve) => {
      const audio = new window.Audio();
      let timeoutId = 0;

      const finalize = (value: number | null): void => {
        window.clearTimeout(timeoutId);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        audio.src = '';
        resolve(value);
      };

      const handleLoadedMetadata = (): void => {
        finalize(Number.isFinite(audio.duration) ? audio.duration : null);
      };

      const handleError = (): void => {
        finalize(null);
      };

      timeoutId = window.setTimeout(() => {
        finalize(null);
      }, AUDIO_METADATA_TIMEOUT_MS);

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);
      audio.preload = 'metadata';
      audio.src = objectUrl;
      audio.load();
    });

    return duration;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function hasUsableContinuousBed(
  blobs: AudioBlobMap | CachedSoundscape['audioBlobs'] | null | undefined
): Promise<boolean> {
  if (!hasContinuousBedBlob(blobs)) {
    return false;
  }

  const candidateBlobs = CONTINUOUS_BED_LAYERS
    .map((layerType) => blobs?.[layerType] ?? null)
    .filter((blob): blob is Blob => blob instanceof Blob);

  for (const blob of candidateBlobs) {
    const measuredDuration = await measureBlobDurationSeconds(blob);
    if (measuredDuration === null) {
      return true;
    }

    if (measuredDuration >= MIN_CONTINUOUS_BED_DURATION_SECONDS) {
      return true;
    }
  }

  return false;
}

async function filterPlayableCachedEntries(
  entries: CachedSoundscape[]
): Promise<CachedSoundscape[]> {
  const validEntries: CachedSoundscape[] = [];

  for (const entry of entries) {
    if (await hasUsableContinuousBed(entry.audioBlobs as AudioBlobMap | undefined)) {
      validEntries.push(entry);
      continue;
    }

    await deleteCachedSoundscape(entry.id);
  }

  return validEntries;
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

function sortCachedLocations(entries: CachedSoundscape[]): CachedSoundscape[] {
  return [...entries].sort((left, right) => right.generatedAt - left.generatedAt);
}

function upsertCachedLocation(
  entries: CachedSoundscape[],
  nextEntry: CachedSoundscape
): CachedSoundscape[] {
  const remaining = entries.filter((entry) => entry.id !== nextEntry.id);
  return sortCachedLocations([nextEntry, ...remaining]);
}

function createCoordinateToken(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function formatCoordinateFallback([lat, lng]: [number, number]): string {
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

function createGenerationJob(lat: number, lng: number): GenerationJob {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coordinateToken: createCoordinateToken(lat, lng),
    coordinates: [lat, lng],
    cacheKey: null,
    cityName: null,
    regionName: null,
    countryName: null,
    timeSlot: null,
    createdAt: Date.now(),
    progress: 8,
    status: 'resolving',
    errorMessage: null,
    locationContext: null,
  };
}

export interface UseSoundscapeSessionResult {
  status: SessionStatus;
  locationEntries: SessionLocationEntry[];
  mapPins: SessionMapPin[];
  cachedMarkers: CachedSoundscape[];
  hasConfiguredApiKey: boolean | null;
  hasActiveGeneration: boolean;
  preferences: UserPreferences;
  playbackState: PlaybackStateInfo;
  activePlaybackLocationId: string | null;
  isAudioSupported: boolean | null;
  handleCoordinateSelect: (lat: number, lng: number) => Promise<void>;
  handleMarkerSelect: (cacheKey: string) => Promise<void>;
  handleLocationSelect: (cacheKey: string) => Promise<void>;
  deleteLocationEntry: (
    entry: Pick<SessionLocationEntry, 'id' | 'cacheKey' | 'status'>
  ) => Promise<void>;
  handleHoverPreview: (lat: number, lng: number) => Promise<void>;
  handleHoverEnd: () => void;
  playLocation: (cacheKey: string) => Promise<void>;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  setMasterVolume: (volume: number) => void;
  setLayerVolume: (layerType: LayerType, volume: number) => void;
}

export function useSoundscapeSession(): UseSoundscapeSessionResult {
  const { locale, messages } = useI18n();
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [cachedMarkers, setCachedMarkers] = useState<CachedSoundscape[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(createDefaultPreferences);
  const [hasConfiguredApiKey, setHasConfiguredApiKey] = useState<boolean | null>(null);

  const cachedMarkersRef = useRef<CachedSoundscape[]>([]);
  const generationJobsRef = useRef<GenerationJob[]>([]);
  const cancelledGenerationJobIdsRef = useRef<Set<string>>(new Set());
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

  useEffect(() => {
    cachedMarkersRef.current = cachedMarkers;
  }, [cachedMarkers]);

  useEffect(() => {
    generationJobsRef.current = generationJobs;
  }, [generationJobs]);

  const updateGenerationJob = useCallback(
    (jobId: string, updater: (job: GenerationJob) => GenerationJob): void => {
      setGenerationJobs((previous) =>
        previous.map((job) => (job.id === jobId ? updater(job) : job))
      );
    },
    []
  );

  const removeGenerationJob = useCallback((jobId: string): void => {
    setGenerationJobs((previous) => previous.filter((job) => job.id !== jobId));
  }, []);

  const isGenerationJobCancelled = useCallback((jobId: string): boolean => {
    return cancelledGenerationJobIdsRef.current.has(jobId);
  }, []);

  const refreshCaches = useCallback(async (): Promise<void> => {
    const markers = await getCachedMarkers();
    const playableMarkers = await filterPlayableCachedEntries(sortCachedLocations(markers));
    setCachedMarkers(playableMarkers);
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
      if (
        event.key == null ||
        event.key === 'pindrop_preferences' ||
        event.key === 'pindrop_api_key' ||
        event.key === 'pindrop_llm_api_key'
      ) {
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

  const playLocation = useCallback(
    async (cacheKey: string): Promise<void> => {
      const cachedFromState =
        cachedMarkersRef.current.find((entry) => entry.id === cacheKey) ?? null;
      const cached =
        cachedFromState?.audioBlobs && cachedFromState.recipe
          ? cachedFromState
          : await getCachedSoundscape(cacheKey);
      const recipe = coerceRecipe(cached?.recipe);

      if (!cached || !recipe || !cached.audioBlobs) {
        return;
      }

      if (!(await hasUsableContinuousBed(cached.audioBlobs as AudioBlobMap))) {
        await deleteCachedSoundscape(cacheKey);
        setCachedMarkers((previous) => previous.filter((entry) => entry.id !== cacheKey));
        void refreshCaches();
        return;
      }

      cleanupPreview(false);
      await enableAudio();
      await play(recipe, cached.audioBlobs as AudioBlobMap);
      await recordSuccessfulPlayback(cacheKey, recipe);
    },
    [cleanupPreview, enableAudio, play, recordSuccessfulPlayback]
  );

  const runGeneration = useCallback(
    async (jobId: string, lat: number, lng: number): Promise<void> => {
      try {
        if (!hasApiKey()) {
          throw new Error(messages.session.apiKeyRequiredError);
        }

        if (isGenerationJobCancelled(jobId)) {
          return;
        }

        updateGenerationJob(jobId, (job) => ({
          ...job,
          progress: 18,
          status: 'resolving',
          errorMessage: null,
        }));

        const location = await resolveLocation(lat, lng);
        if (isGenerationJobCancelled(jobId)) {
          return;
        }
        const cacheKey = generateCacheKey(lat, lng, location.currentLocalHour);

        updateGenerationJob(jobId, (job) => ({
          ...job,
          cacheKey,
          cityName: location.cityName,
          regionName: location.regionName ?? null,
          countryName: location.countryName,
          timeSlot: location.timeSlot,
          progress: 48,
          status: 'generating',
          errorMessage: null,
          locationContext: location,
        }));

        const cached = await getCachedSoundscape(cacheKey);
        if (isGenerationJobCancelled(jobId)) {
          return;
        }
        const cachedRecipe = coerceRecipe(cached?.recipe);
        if (cached && cachedRecipe && cached.audioBlobs) {
          if (!(await hasUsableContinuousBed(cached.audioBlobs as AudioBlobMap))) {
            await deleteCachedSoundscape(cacheKey);
          } else {
          setCachedMarkers((previous) => upsertCachedLocation(previous, cached));
          removeGenerationJob(jobId);
          return;
          }
        }

        let narrativeAnchors = null;
        const llmEnhancementConfig = getLlmEnhancementConfig();
        if (llmEnhancementConfig) {
          try {
            narrativeAnchors = await enrichSoundscapeNarrative(
              location,
              llmEnhancementConfig
            );
          } catch (error) {
            console.warn('[PinDrop] LLM narrative enrichment skipped:', error);
          }
        }

        const recipe = generateRecipe(location, { narrativeAnchors });
        if (isGenerationJobCancelled(jobId)) {
          return;
        }

        updateGenerationJob(jobId, (job) => ({
          ...job,
          progress: 76,
          status: 'generating',
        }));

        const generatedAudio = await generateSoundscapeAudio(recipe);
        if (isGenerationJobCancelled(jobId)) {
          return;
        }
        const blobs = generatedAudio.blobs;

        if (Object.keys(blobs).length === 0) {
          throw new Error(messages.session.noAudioLayers);
        }

        if (!(await hasUsableContinuousBed(blobs))) {
          throw new Error(messages.session.noAudioLayers);
        }

        const nextCachedEntry: CachedSoundscape = {
          id: cacheKey,
          coordinates: recipe.location.coordinates,
          timeSlot: recipe.location.timeSlot,
          cityName: recipe.location.cityName,
          countryName: recipe.location.countryName,
          generatedAt: recipe.generatedAt,
          playCount: 0,
          lastPlayedAt: recipe.generatedAt,
          sizeBytes: getSoundscapeSizeBytes(blobs),
          playbackDurationSeconds: DEFAULT_RENDER_DURATION_SECONDS,
          audioBlobs: blobs,
          recipe,
        };

        await cacheSoundscape(cacheKey, {
          coordinates: nextCachedEntry.coordinates,
          timeSlot: nextCachedEntry.timeSlot,
          cityName: nextCachedEntry.cityName,
          countryName: nextCachedEntry.countryName,
          generatedAt: nextCachedEntry.generatedAt,
          playCount: nextCachedEntry.playCount,
          lastPlayedAt: nextCachedEntry.lastPlayedAt,
          sizeBytes: nextCachedEntry.sizeBytes,
          playbackDurationSeconds: nextCachedEntry.playbackDurationSeconds,
          audioBlobs: nextCachedEntry.audioBlobs,
          recipe: nextCachedEntry.recipe,
        });

        if (isGenerationJobCancelled(jobId)) {
          await deleteCachedSoundscape(cacheKey);
          return;
        }

        setCachedMarkers((previous) => upsertCachedLocation(previous, nextCachedEntry));
        removeGenerationJob(jobId);
        void refreshCaches();
      } catch (error) {
        if (isGenerationJobCancelled(jobId)) {
          return;
        }

        const fallbackMessage = messages.session.generationFailed;
        const nextMessage =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : fallbackMessage;

        updateGenerationJob(jobId, (job) => ({
          ...job,
          progress: 100,
          status: 'error',
          errorMessage: nextMessage,
        }));
      } finally {
        cancelledGenerationJobIdsRef.current.delete(jobId);
      }
    },
    [
      isGenerationJobCancelled,
      messages,
      refreshCaches,
      removeGenerationJob,
      updateGenerationJob,
    ]
  );

  const handleCoordinateSelect = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      if (!hasApiKey()) {
        setHasConfiguredApiKey(false);
        return;
      }

      const coordinateToken = createCoordinateToken(lat, lng);
      const existingJob = generationJobsRef.current.find(
        (job) => job.coordinateToken === coordinateToken && job.status !== 'error'
      );

      if (existingJob) {
        return;
      }

      const job = createGenerationJob(lat, lng);
      setGenerationJobs((previous) => [job, ...previous]);
      void runGeneration(job.id, lat, lng);
    },
    [runGeneration]
  );

  const handleMarkerSelect = useCallback(
    async (cacheKey: string): Promise<void> => {
      await playLocation(cacheKey);
    },
    [playLocation]
  );

  const handleLocationSelect = useCallback(
    async (cacheKey: string): Promise<void> => {
      await playLocation(cacheKey);
    },
    [playLocation]
  );

  const deleteLocationEntry = useCallback(
    async (
      entry: Pick<SessionLocationEntry, 'id' | 'cacheKey' | 'status'>
    ): Promise<void> => {
      if (entry.status !== 'ready') {
        cancelledGenerationJobIdsRef.current.add(entry.id);
        removeGenerationJob(entry.id);
        return;
      }

      if (!entry.cacheKey) {
        return;
      }

      if (playbackState.soundscapeId === entry.cacheKey) {
        stop();
      }

      setCachedMarkers((previous) =>
        previous.filter((cachedEntry) => cachedEntry.id !== entry.cacheKey)
      );
      await deleteCachedSoundscape(entry.cacheKey);
      void refreshCaches();
    },
    [playbackState.soundscapeId, refreshCaches, removeGenerationJob, stop]
  );

  const hasActiveGeneration = useMemo(
    () => generationJobs.some((job) => job.status !== 'error'),
    [generationJobs]
  );

  const handleHoverPreview = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      if (!hasApiKey() || hasActiveGeneration) {
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
    [cleanupPreview, hasActiveGeneration]
  );

  const handleHoverEnd = useCallback((): void => {
    cleanupPreview(true);
  }, [cleanupPreview]);

  const describeLocationContext = useCallback(
    (
      locationContext: LocationContext | null,
      narrativeAnchors?: SoundscapeRecipe['narrativeAnchors']
    ): Pick<SessionLocationEntry, 'sceneDescription' | 'soundDescription'> => {
      if (!locationContext) {
        return {
          sceneDescription: undefined,
          soundDescription: undefined,
        };
      }

      return {
        sceneDescription: messages.session.sceneDescription(
          messages.enums.timeSlots[locationContext.timeSlot],
          messages.enums.regions[locationContext.regionType],
          messages.enums.climates[locationContext.climate]
        ),
        soundDescription: getSoundSummary(locationContext, locale, narrativeAnchors),
      };
    },
    [locale, messages]
  );

  const locationEntries = useMemo<SessionLocationEntry[]>(() => {
    const loadingEntries = generationJobs.map((job) => {
      const cityName = job.cityName ?? formatCoordinateFallback(job.coordinates);
      const countryName = job.countryName ?? '';
      const isError = job.status === 'error';
      const narrative = describeLocationContext(job.locationContext);

      return {
        id: job.id,
        cacheKey: job.cacheKey,
        coordinates: job.coordinates,
        cityName,
        regionName: job.regionName ?? job.locationContext?.regionName,
        countryName,
        timeSlot: job.timeSlot,
        createdAt: job.createdAt,
        progress: job.progress,
        status: isError ? ('error' as const) : ('loading' as const),
        statusLabel: isError
          ? job.errorMessage ?? messages.session.generationFailed
          : job.status === 'resolving'
            ? messages.common.loading
            : messages.session.generating,
        errorMessage: job.errorMessage,
        isPlayable: false,
        playbackDurationSeconds: undefined,
        ...narrative,
      };
    });

    const readyEntries: SessionLocationEntry[] = cachedMarkers
      .filter((entry) => hasContinuousBedBlob(entry.audioBlobs))
      .map((entry) => {
        const recipe = coerceRecipe(entry.recipe);
        const narrative = describeLocationContext(
          recipe?.location ?? null,
          recipe?.narrativeAnchors
        );

        return {
          id: entry.id,
          cacheKey: entry.id,
          coordinates: entry.coordinates,
          cityName: entry.cityName,
          regionName: recipe?.location.regionName,
          countryName: entry.countryName,
          timeSlot: entry.timeSlot,
          createdAt: entry.generatedAt,
          progress: 100,
          status: 'ready',
          statusLabel:
            playbackState.soundscapeId === entry.id && playbackState.state === 'playing'
              ? messages.home.playbackStatus.playing
              : playbackState.soundscapeId === entry.id && playbackState.state === 'paused'
                ? messages.home.playbackStatus.paused
                : messages.home.playbackStatus.ready,
          errorMessage: null,
          isPlayable: true,
          playbackDurationSeconds:
            entry.playbackDurationSeconds ?? DEFAULT_RENDER_DURATION_SECONDS,
          ...narrative,
        };
      });

    return [...loadingEntries, ...readyEntries].sort((left, right) => right.createdAt - left.createdAt);
  }, [
    cachedMarkers,
    describeLocationContext,
    generationJobs,
    messages,
    playbackState.soundscapeId,
    playbackState.state,
  ]);

  const mapPins = useMemo<SessionMapPin[]>(() => {
    const readyPins = cachedMarkers
      .filter((entry) => hasContinuousBedBlob(entry.audioBlobs))
      .map((entry) => ({
        id: entry.id,
        cacheKey: entry.id,
        coordinates: entry.coordinates,
        isGenerating: false,
        isSelectable: true,
      }));

    const loadingPins = generationJobs.map((job) => ({
      id: job.id,
      cacheKey: job.cacheKey,
      coordinates: job.coordinates,
      isGenerating: job.status !== 'error',
      isSelectable: false,
    }));

    return [...readyPins, ...loadingPins];
  }, [cachedMarkers, generationJobs]);

  const status: SessionStatus = useMemo(() => {
    if (playbackState.state === 'error' || generationJobs.some((job) => job.status === 'error')) {
      return hasActiveGeneration ? 'loading' : 'error';
    }

    if (hasActiveGeneration) {
      return 'loading';
    }

    if (
      cachedMarkers.some((entry) => hasContinuousBedBlob(entry.audioBlobs)) ||
      playbackState.state === 'playing' ||
      playbackState.state === 'paused'
    ) {
      return 'ready';
    }

    return 'idle';
  }, [cachedMarkers, generationJobs, hasActiveGeneration, playbackState.state]);

  return {
    status,
    locationEntries,
    mapPins,
    cachedMarkers,
    hasConfiguredApiKey,
    hasActiveGeneration,
    preferences,
    playbackState: playbackState ?? INITIAL_PLAYBACK_STATE,
    activePlaybackLocationId: playbackState.soundscapeId,
    isAudioSupported: isSupported,
    handleCoordinateSelect,
    handleMarkerSelect,
    handleLocationSelect,
    deleteLocationEntry,
    handleHoverPreview,
    handleHoverEnd,
    playLocation,
    pausePlayback: pause,
    resumePlayback: resume,
    stopPlayback: stop,
    setMasterVolume,
    setLayerVolume,
  };
}
