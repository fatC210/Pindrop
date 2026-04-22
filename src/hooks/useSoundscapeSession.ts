'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import type { AppLocale } from '@/i18n/types';
import type { LayerType, AudioBlobMap, PlaybackStateInfo } from '@/utils/audio/types';
import type { LocationContext } from '@/types/locationContext';
import type {
  LocalizedCueLabel,
  NarrativeAnchorCue,
  SoundscapeRecipe,
} from '@/types/soundscapeRecipe';
import type { CachedSoundscape } from '@/utils/soundscapeCache';
import type { UserPreferences } from '@/components/settings/types';
import {
  PREFERENCES_UPDATED_EVENT,
  arePreferencesEqual,
  getLlmEnhancementConfig,
  preferencesStore,
} from '@/components/settings/preferencesStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { resolveLocation } from '@/utils/geocoding';
import { generateRecipe } from '@/utils/soundscape';
import {
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
import {
  enrichSoundscapeNarrative,
  sanitizeNarrativeDisplayText,
} from '@/utils/soundscape/llmAnchorEnricher';
import { buildRuleBasedNarrativeAnchors } from '@/utils/soundscape/sceneNarrative';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';
type GenerationJobStatus = 'resolving' | 'generating' | 'error';
type NarrativeSource = 'llm' | 'rules';
type LlmFallbackReason = 'llm_unavailable' | 'llm_request_failed';

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
  administrativeRegionName: string | null;
  cityName: string | null;
  regionName: string | null;
  countryName: string | null;
  timeSlot: TimeSlot | null;
  createdAt: number;
  progress: number;
  status: GenerationJobStatus;
  narrativeAnchors: SoundscapeRecipe['narrativeAnchors'] | null;
  narrativeSource: NarrativeSource | null;
  llmFallbackReason: LlmFallbackReason | null;
  errorMessage: string | null;
  locationContext: LocationContext | null;
  displayLocale: AppLocale;
}

export interface SessionLocationEntry {
  id: string;
  cacheKey: string | null;
  coordinates: [number, number];
  displayLocale?: AppLocale;
  administrativeRegionName?: string;
  cityName: string;
  regionName?: string;
  countryName: string;
  timeSlot: TimeSlot | null;
  createdAt: number;
  progress: number;
  status: 'loading' | 'ready' | 'error';
  narrativeSource?: NarrativeSource | null;
  llmFallbackReason?: LlmFallbackReason | null;
  fallbackNotice?: string;
  statusLabel: string;
  errorMessage: string | null;
  isPlayable: boolean;
  playbackDurationSeconds?: number;
  sceneDescription?: string;
}

function normalizeDisplayText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripNarrativeLeadScaffolding(text: string): string {
  return normalizeDisplayText(
    text.replace(
      /^(?:anchor|anchors|cue|cues|summary|scene\s*\d+|sound\s*cue|sound\s*cues)\s*[:\-]\s*/i,
      ''
    )
  );
}

function getScriptFlags(text: string): { hasCjk: boolean; hasLatin: boolean } {
  return {
    hasCjk: /[\u3400-\u9fff]/.test(text),
    hasLatin: /[A-Za-z]/.test(text),
  };
}

function strictlyMatchesLocale(text: string, locale: AppLocale): boolean {
  const normalized = stripNarrativeLeadScaffolding(text);
  if (!normalized) {
    return false;
  }

  const { hasCjk, hasLatin } = getScriptFlags(normalized);

  if (locale === 'zh-CN') {
    return hasCjk && !hasLatin;
  }

  return hasLatin && !hasCjk;
}

function extractLocaleSpecificSegments(text: string, locale: AppLocale): string[] {
  return text
    .split(/[()\[\]{}（）【】\r\n]+/)
    .flatMap((segment) => segment.split(/\s*(?:\/|｜|\|)\s*/))
    .map((segment) => stripNarrativeLeadScaffolding(segment))
    .filter((segment, index, allSegments) => {
      return strictlyMatchesLocale(segment, locale) && allSegments.indexOf(segment) === index;
    });
}

function stripNonTargetScriptText(
  text: string,
  locale: AppLocale
): string | undefined {
  const normalized = stripNarrativeLeadScaffolding(text);
  if (!normalized) {
    return undefined;
  }

  const stripped =
    locale === 'zh-CN'
      ? normalized
          .replace(/[A-Za-z0-9]+(?:[\/&'’._:-][A-Za-z0-9]+)*/g, ' ')
          .replace(/[()[\]{}<>]/g, ' ')
      : normalized
          .replace(/[\u3400-\u9fff]/g, ' ')
          .replace(/[（）。！？；：，、】【、《》「」『』]/g, ' ');

  const cleaned = normalizeDisplayText(stripped).replace(
    /^[\s,;:/|()[\]{}<>-]+|[\s,;:/|()[\]{}<>-]+$/g,
    ''
  );

  if (!strictlyMatchesLocale(cleaned, locale)) {
    return undefined;
  }

  return cleaned;
}

function resolveLocaleDisplayText(text: string, locale: AppLocale): string | undefined {
  const normalized = stripNarrativeLeadScaffolding(text);
  if (!normalized) {
    return undefined;
  }

  if (strictlyMatchesLocale(normalized, locale)) {
    return normalized;
  }

  const extractedSegments = extractLocaleSpecificSegments(normalized, locale);
  if (extractedSegments.length > 0) {
    return extractedSegments.join(' / ');
  }

  return stripNonTargetScriptText(normalized, locale);
}

function textMatchesLocale(text: string, locale: AppLocale): boolean {
  return resolveLocaleDisplayText(text, locale) !== undefined;
}

function isDisplayableSceneDescription(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return false;
  }

  return ![
    /^\s*(?:cues?|summary)\s*:/i,
    /^\s*scene\s*\d+\s*:/i,
    /(?:^|\s)\d+\s*[\).:]\s+\S+/,
  ].some((pattern) => pattern.test(normalized));
}

function getCueLabelText(
  cue: NarrativeAnchorCue,
  locale: AppLocale
): string | undefined {
  const primary = resolveLocaleDisplayText(cue.label?.[locale] ?? '', locale);
  if (primary) {
    return primary;
  }

  const prompt = resolveLocaleDisplayText(cue.prompt ?? '', locale);
  if (prompt) {
    return prompt;
  }

  return undefined;
}

function getCueLabelSegments(
  cue: NarrativeAnchorCue,
  locale: AppLocale
): string[] {
  const rawCandidates = [cue.label?.[locale] ?? '', cue.prompt ?? ''];
  const segments: string[] = [];

  for (const candidate of rawCandidates) {
    const localeSegments = extractLocaleSpecificSegments(candidate, locale);
    if (localeSegments.length > 0) {
      for (const segment of localeSegments) {
        const normalized = segment.replace(/\s+/g, ' ').trim();
        if (normalized && !segments.includes(normalized)) {
          segments.push(normalized);
        }
      }
    }

    const fallback = resolveLocaleDisplayText(candidate, locale);
    if (fallback) {
      const normalized = fallback.replace(/\s+/g, ' ').trim();
      if (normalized && !segments.includes(normalized)) {
        segments.push(normalized);
      }
    }
  }

  return segments;
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s'"`~!@#$%^&*+=|\\/:;,.?()[\]{}<>-]+/g, '');
}

function isLocationLikeLabel(
  label: string,
  context: LocationContext | null | undefined
): boolean {
  if (!context) {
    return false;
  }

  const normalizedLabel = normalizeComparableText(label);
  if (!normalizedLabel) {
    return false;
  }

  const locationParts = [
    context.countryName,
    context.administrativeRegionName ?? '',
    context.cityName,
    context.regionName ?? '',
  ]
    .map((part) => normalizeComparableText(part))
    .filter((part, index, allParts) => part.length >= 2 && allParts.indexOf(part) === index);

  if (locationParts.length === 0) {
    return false;
  }

  return locationParts.some((part) => {
    if (normalizedLabel === part) {
      return true;
    }

    if (!normalizedLabel.includes(part)) {
      return false;
    }

    const residual = normalizedLabel.split(part).join('');
    return residual.length <= 3;
  });
}

function getComparableCueUnits(text: string, locale: AppLocale): string[] {
  if (locale === 'zh-CN') {
    const stripped = text.replace(/[的了着在里中上下一些一阵一声偶尔远处近处附近轻轻低低隐约]/g, '');
    return Array.from(new Set(Array.from(stripped).filter((char) => /[\u3400-\u9fff]/.test(char))));
  }

  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(
      (token) =>
        token.length >= 3 &&
        !['the', 'and', 'with', 'from', 'near', 'into', 'onto', 'over', 'under', 'along', 'through'].includes(token)
    );
}

function areNearDuplicateCueLabels(
  left: string,
  right: string,
  locale: AppLocale
): boolean {
  const normalizedLeft = normalizeComparableText(left);
  const normalizedRight = normalizeComparableText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return true;
  }

  const leftUnits = getComparableCueUnits(left, locale);
  const rightUnits = getComparableCueUnits(right, locale);

  if (leftUnits.length === 0 || rightUnits.length === 0) {
    return false;
  }

  const rightUnitSet = new Set(rightUnits);
  const overlap = leftUnits.filter((unit) => rightUnitSet.has(unit)).length;
  const overlapRatio = overlap / Math.min(leftUnits.length, rightUnits.length);

  return overlapRatio >= 0.75;
}

function buildCueListDescription(
  narrativeAnchors: SoundscapeRecipe['narrativeAnchors'] | null | undefined,
  locale: AppLocale,
  context?: LocationContext | null
): string | undefined {
  const cues = narrativeAnchors?.cues ?? [];
  const fallbackCues =
    context ? (buildRuleBasedNarrativeAnchors(context)?.cues ?? []) : [];
  const labels: string[] = [];
  const pushLabel = (candidate: string): void => {
    const normalized = candidate.replace(/\s+/g, ' ').trim();
    if (!normalized || isLocationLikeLabel(normalized, context)) {
      return;
    }

    if (labels.some((existing) => areNearDuplicateCueLabels(existing, normalized, locale))) {
      return;
    }

    labels.push(normalized);
  };

  for (const cue of cues) {
    for (const segment of getCueLabelSegments(cue, locale)) {
      pushLabel(segment);
    }
  }

  if (labels.length >= 3) {
    return labels.slice(0, 3).join(' / ');
  }

  if (labels.length === 0 || labels.length === 1) {
    return undefined;
  }

  for (const cue of fallbackCues) {
    const fallbackLabel = getCueLabelText(cue, locale);
    if (!fallbackLabel) {
      continue;
    }

    pushLabel(fallbackLabel);
    if (labels.length >= 3) {
      return labels.slice(0, 3).join(' / ');
    }
  }

  return labels.slice(0, 3).join(' / ');
}

function getDisplayableNarrativeSummary(
  summary: LocalizedCueLabel | undefined,
  locale: AppLocale,
  context?: LocationContext
): string | undefined {
  const candidate = resolveLocaleDisplayText(summary?.[locale] ?? '', locale);
  if (candidate && isDisplayableSceneDescription(candidate)) {
    const sanitized = sanitizeNarrativeDisplayText(candidate, locale, context);
    const localizedSanitized = sanitized
      ? resolveLocaleDisplayText(sanitized, locale)
      : undefined;

    return localizedSanitized ?? candidate;
  }

  return undefined;
}

function getFallbackNotice(
  narrativeAnchors: SoundscapeRecipe['narrativeAnchors'] | null | undefined,
  locale: AppLocale
): string | undefined {
  const candidate = narrativeAnchors?.fallbackReason?.[locale]?.trim();
  if (candidate) {
    return candidate;
  }

  const alternateLocale = locale === 'zh-CN' ? 'en' : 'zh-CN';
  return narrativeAnchors?.fallbackReason?.[alternateLocale]?.trim() || undefined;
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

function getSerializableErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof AggregateError) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      errors: error.errors.map((nestedError) => getSerializableErrorDetails(nestedError)),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause !== undefined
        ? { cause: getSerializableErrorDetails(error.cause) }
        : {}),
    };
  }

  if (typeof error === 'string') {
    return { value: error };
  }

  if (error && typeof error === 'object') {
    return { ...error };
  }

  return { value: error };
}

function getErrorMessageString(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return '';
}

function createLlmFallbackReasonLabel(
  locale: AppLocale,
  reason: LlmFallbackReason,
  detail?: string
): { en: string; 'zh-CN': string } {
  const trimmedDetail = detail?.trim();

  if (reason === 'llm_request_failed' && trimmedDetail) {
    return {
      en: `Using fallback scene because the LLM request failed: ${trimmedDetail}`,
      'zh-CN': `已因 LLM 请求失败回退到规则音景：${trimmedDetail}`,
    };
  }

  if (reason === 'llm_request_failed') {
    return {
      en: 'Using fallback scene because the LLM request failed.',
      'zh-CN': '已因 LLM 请求失败回退到规则音景。',
    };
  }

  return {
    en: 'Using fallback scene because the LLM did not return a usable place-specific narrative.',
    'zh-CN': '已因 LLM 未返回可用的地点叙事而回退到规则音景。',
  };
}

function stripSpeechLayers(blobs: AudioBlobMap): AudioBlobMap {
  const sanitizedBlobs: AudioBlobMap = { ...blobs };
  delete sanitizedBlobs.dialogue;
  delete sanitizedBlobs.secondaryDialogue;
  return sanitizedBlobs;
}

function buildLayerFailureMessage(
  failureMessages: Partial<Record<LayerType, string>> | undefined,
  fallbackMessage: string
): string {
  if (!failureMessages) {
    return fallbackMessage;
  }

  const messages = Object.values(failureMessages).filter(
    (message): message is string => typeof message === 'string' && message.trim().length > 0
  );

  if (messages.length === 0) {
    return fallbackMessage;
  }

  return messages.join(' | ');
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

function createGenerationJob(
  lat: number,
  lng: number,
  displayLocale: AppLocale
): GenerationJob {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coordinateToken: createCoordinateToken(lat, lng),
    coordinates: [lat, lng],
    cacheKey: null,
    administrativeRegionName: null,
    cityName: null,
    regionName: null,
    countryName: null,
    timeSlot: null,
    createdAt: Date.now(),
    progress: 8,
    status: 'resolving',
    narrativeAnchors: null,
    narrativeSource: null,
    llmFallbackReason: null,
    errorMessage: null,
    locationContext: null,
    displayLocale,
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

  const hasGenerationConfiguration = useCallback((): boolean => {
    return hasApiKey() && getLlmEnhancementConfig() !== null;
  }, []);

  const syncBrowserSettings = useCallback((): void => {
    const nextPreferences = preferencesStore.loadPreferences();
    setPreferences((currentPreferences) =>
      arePreferencesEqual(currentPreferences, nextPreferences)
        ? currentPreferences
        : nextPreferences
    );
    setHasConfiguredApiKey(hasGenerationConfiguration());
  }, [hasGenerationConfiguration]);

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

      const sanitizedBlobs = stripSpeechLayers(cached.audioBlobs as AudioBlobMap);

      if (!(await hasUsableContinuousBed(sanitizedBlobs))) {
        await deleteCachedSoundscape(cacheKey);
        setCachedMarkers((previous) => previous.filter((entry) => entry.id !== cacheKey));
        void refreshCaches();
        return;
      }

      await enableAudio();
      await play(recipe, sanitizedBlobs);
      await recordSuccessfulPlayback(cacheKey, recipe);
    },
    [enableAudio, play, recordSuccessfulPlayback, refreshCaches]
  );

  const runGeneration = useCallback(
    async (jobId: string, lat: number, lng: number): Promise<void> => {
      try {
        const llmEnhancementConfig = getLlmEnhancementConfig();
        if (!hasApiKey() || !llmEnhancementConfig) {
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
          administrativeRegionName: location.administrativeRegionName ?? null,
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
          const sanitizedCachedBlobs = stripSpeechLayers(cached.audioBlobs as AudioBlobMap);
          if (!(await hasUsableContinuousBed(sanitizedCachedBlobs))) {
            await deleteCachedSoundscape(cacheKey);
          } else {
            const sanitizedCachedEntry: CachedSoundscape = {
              ...cached,
              audioBlobs: sanitizedCachedBlobs,
            };
            setCachedMarkers((previous) =>
              upsertCachedLocation(previous, sanitizedCachedEntry)
            );
            removeGenerationJob(jobId);
            return;
          }
        }

        let narrativeAnchors: SoundscapeRecipe['narrativeAnchors'] | null = null;
        let narrativeSource: NarrativeSource = 'rules';
        let llmFallbackReason: LlmFallbackReason | null = null;
        const ruleNarrativeAnchors = buildRuleBasedNarrativeAnchors(location);

        try {
          narrativeAnchors = await enrichSoundscapeNarrative(
            location,
            llmEnhancementConfig,
            locale
          );
          if (narrativeAnchors?.source === 'llm') {
            narrativeSource = 'llm';
          } else if (!narrativeAnchors) {
            llmFallbackReason = 'llm_unavailable';
            console.warn('[PinDrop Warning] LLM narrative unavailable, falling back to rules:', {
              jobId,
              coordinates: { lat, lng },
              message: messages.session.llmRequiredError,
            });
            narrativeAnchors = {
              ...(ruleNarrativeAnchors ?? {
                source: 'rules' as const,
                confidence: 0.58,
                cues: [],
              }),
              source: 'rules',
              fallbackReasonCode: llmFallbackReason,
              fallbackReason: createLlmFallbackReasonLabel(
                locale,
                llmFallbackReason,
                messages.session.llmRequiredError
              ),
            };
          }
        } catch (error) {
          llmFallbackReason = 'llm_request_failed';
          const detail = getErrorMessageString(error);
          console.warn('[PinDrop Warning] LLM narrative request failed, falling back to rules:', {
            jobId,
            coordinates: { lat, lng },
            errorDetails: getSerializableErrorDetails(error),
          });
          narrativeAnchors = {
            ...(ruleNarrativeAnchors ?? {
              source: 'rules' as const,
              confidence: 0.58,
              cues: [],
            }),
            source: 'rules',
            fallbackReasonCode: llmFallbackReason,
            fallbackReason: createLlmFallbackReasonLabel(locale, llmFallbackReason, detail),
          };
        }

        const recipe = generateRecipe(location, {
          narrativeAnchors,
          interfaceLocale: locale,
        });
        if (isGenerationJobCancelled(jobId)) {
          return;
        }

        updateGenerationJob(jobId, (job) => ({
          ...job,
          narrativeAnchors,
          narrativeSource,
          llmFallbackReason,
          displayLocale: locale,
          progress: 76,
          status: 'generating',
        }));

        const generatedAudio = await generateSoundscapeAudio(recipe);
        if (isGenerationJobCancelled(jobId)) {
          return;
        }
        const blobs = stripSpeechLayers(generatedAudio.blobs);
        const layerFailureMessage = buildLayerFailureMessage(
          generatedAudio.failureMessages,
          messages.session.noAudioLayers
        );

        if (Object.keys(blobs).length === 0) {
          throw new Error(layerFailureMessage);
        }

        if (!(await hasUsableContinuousBed(blobs))) {
          throw new Error(layerFailureMessage);
        }

        const nextCachedEntry: CachedSoundscape = {
          id: cacheKey,
          coordinates: recipe.location.coordinates,
          timeSlot: recipe.location.timeSlot,
          administrativeRegionName: recipe.location.administrativeRegionName,
          cityName: recipe.location.cityName,
          regionName: recipe.location.regionName,
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
          administrativeRegionName: nextCachedEntry.administrativeRegionName,
          cityName: nextCachedEntry.cityName,
          regionName: nextCachedEntry.regionName,
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

        console.warn('[PinDrop Warning] Soundscape generation failed:', {
          jobId,
          coordinates: { lat, lng },
          message: nextMessage,
          errorDetails: getSerializableErrorDetails(error),
        });

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
      locale,
      messages,
      refreshCaches,
      removeGenerationJob,
      updateGenerationJob,
    ]
  );

  const handleCoordinateSelect = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      if (!hasGenerationConfiguration()) {
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

      const job = createGenerationJob(lat, lng, locale);
      setGenerationJobs((previous) => [job, ...previous]);
      void runGeneration(job.id, lat, lng);
    },
    [hasGenerationConfiguration, locale, runGeneration]
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

  const describeLocationContext = useCallback(
    (
      locationContext: LocationContext | null,
      displayLocale: AppLocale,
      allowAlternateLocaleFallback: boolean,
      narrativeAnchors?: SoundscapeRecipe['narrativeAnchors'] | null
    ): Pick<SessionLocationEntry, 'sceneDescription'> => {
      if (!locationContext) {
        return {
          sceneDescription: undefined,
        };
      }

      const llmNarrativeAnchors =
        narrativeAnchors?.source === 'llm' ? narrativeAnchors : undefined;
      const sceneDescription =
        buildCueListDescription(llmNarrativeAnchors, displayLocale, locationContext) ??
        (llmNarrativeAnchors?.summary
          ? getDisplayableNarrativeSummary(
              llmNarrativeAnchors.summary,
              displayLocale,
              locationContext
            )
          : undefined);

      return {
        sceneDescription,
      };
    },
    []
  );

  const locationEntries = useMemo<SessionLocationEntry[]>(() => {
    const loadingEntries = generationJobs.map((job) => {
      const cityName = job.cityName ?? formatCoordinateFallback(job.coordinates);
      const countryName = job.countryName ?? '';
      const isError = job.status === 'error';
      const narrative = describeLocationContext(
        job.locationContext,
        locale,
        false,
        job.narrativeAnchors
      );

        return {
          id: job.id,
          cacheKey: job.cacheKey,
        coordinates: job.coordinates,
        displayLocale: job.displayLocale,
        administrativeRegionName:
          job.administrativeRegionName ?? job.locationContext?.administrativeRegionName,
        cityName,
        regionName: job.regionName ?? job.locationContext?.regionName,
        countryName,
        timeSlot: job.timeSlot,
          createdAt: job.createdAt,
          progress: job.progress,
          status: isError ? ('error' as const) : ('loading' as const),
          narrativeSource: job.narrativeSource,
          llmFallbackReason: job.llmFallbackReason,
          fallbackNotice: getFallbackNotice(job.narrativeAnchors, locale),
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
        const displayLocale = recipe?.interfaceLocale ?? locale;
        const narrative = describeLocationContext(
          recipe?.location ?? null,
          locale,
          !recipe?.interfaceLocale,
          recipe?.narrativeAnchors
        );

        return {
          id: entry.id,
          cacheKey: entry.id,
          coordinates: entry.coordinates,
          displayLocale,
          administrativeRegionName:
            entry.administrativeRegionName ?? recipe?.location.administrativeRegionName,
          cityName: entry.cityName,
          regionName: entry.regionName ?? recipe?.location.regionName,
          countryName: entry.countryName,
          timeSlot: entry.timeSlot,
          createdAt: entry.generatedAt,
          progress: 100,
          status: 'ready',
          narrativeSource: recipe?.narrativeAnchors?.source ?? null,
          llmFallbackReason:
            recipe?.narrativeAnchors?.source === 'rules'
              ? recipe.narrativeAnchors.fallbackReasonCode ?? null
              : null,
          fallbackNotice: getFallbackNotice(recipe?.narrativeAnchors, locale),
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
    locale,
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
    playLocation,
    pausePlayback: pause,
    resumePlayback: resume,
    stopPlayback: stop,
    setMasterVolume,
    setLayerVolume,
  };
}
