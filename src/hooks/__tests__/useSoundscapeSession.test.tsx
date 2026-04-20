import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getMessages } from '@/i18n/messages';
import type { LocationContext } from '@/types/locationContext';
import { useSoundscapeSession } from '@/hooks/useSoundscapeSession';

const {
  mockUseAudioPlayer,
  mockResolveLocation,
  mockGenerateRecipe,
  mockGenerateSoundscapeAudio,
  mockEnrichSoundscapeNarrative,
  mockGetCachedMarkers,
  mockGetCachedSoundscape,
  mockCacheSoundscape,
  mockDeleteCachedSoundscape,
  mockGetLlmEnhancementConfig,
  mockUpdatePlayStats,
  mockAddLocationHistory,
  mockHasApiKey,
} = vi.hoisted(() => ({
  mockUseAudioPlayer: vi.fn(),
  mockResolveLocation: vi.fn(),
  mockGenerateRecipe: vi.fn(),
  mockGenerateSoundscapeAudio: vi.fn(),
  mockEnrichSoundscapeNarrative: vi.fn(),
  mockGetCachedMarkers: vi.fn(),
  mockGetCachedSoundscape: vi.fn(),
  mockCacheSoundscape: vi.fn(),
  mockDeleteCachedSoundscape: vi.fn(),
  mockGetLlmEnhancementConfig: vi.fn(),
  mockUpdatePlayStats: vi.fn(),
  mockAddLocationHistory: vi.fn(),
  mockHasApiKey: vi.fn(),
}));

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: 'en',
    messages: getMessages('en'),
    setLocale: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: mockUseAudioPlayer,
}));

vi.mock('@/components/settings/preferencesStore', () => ({
  PREFERENCES_UPDATED_EVENT: 'pindrop:preferences-updated',
  getLlmEnhancementConfig: mockGetLlmEnhancementConfig,
  preferencesStore: {
    getDefaultPreferences: () => ({
      interfaceLanguage: 'en',
      mapStyle: 'light',
      autoPlay: true,
      fadeInDuration: 1.5,
      dynamicEvents: true,
      masterVolume: 0.8,
      layerVolumes: {
        ambient: 0.7,
        signature: 0.6,
        dialogue: 0.8,
        secondaryDialogue: 0.5,
        atmosphere: 0.4,
      },
      llmEnhancement: {
        baseUrl: '',
        model: '',
      },
    }),
    loadPreferences: () => ({
      interfaceLanguage: 'en',
      mapStyle: 'light',
      autoPlay: true,
      fadeInDuration: 1.5,
      dynamicEvents: true,
      masterVolume: 0.8,
      layerVolumes: {
        ambient: 0.7,
        signature: 0.6,
        dialogue: 0.8,
        secondaryDialogue: 0.5,
        atmosphere: 0.4,
      },
      llmEnhancement: {
        baseUrl: '',
        model: '',
      },
    }),
  },
}));

vi.mock('@/utils/geocoding', () => ({
  resolveLocation: mockResolveLocation,
}));

vi.mock('@/utils/soundscape', () => ({
  generateRecipe: mockGenerateRecipe,
}));

vi.mock('@/utils/elevenLabsClient', () => ({
  DEFAULT_RENDER_DURATION_SECONDS: 22,
  generateAmbientPreviewAudio: vi.fn(),
  generateDynamicEventAudio: vi.fn(),
  generateSoundscapeAudio: mockGenerateSoundscapeAudio,
}));

vi.mock('@/utils/soundscape/llmAnchorEnricher', () => ({
  enrichSoundscapeNarrative: mockEnrichSoundscapeNarrative,
}));

vi.mock('@/utils/soundscapeCache', () => ({
  cacheSoundscape: mockCacheSoundscape,
  deleteCachedSoundscape: mockDeleteCachedSoundscape,
  getCachedMarkers: mockGetCachedMarkers,
  getCachedSoundscape: mockGetCachedSoundscape,
  updatePlayStats: mockUpdatePlayStats,
}));

vi.mock('@/utils/locationHistory', () => ({
  addLocationHistory: mockAddLocationHistory,
}));

vi.mock('@/utils/apiHeaders', () => ({
  hasApiKey: mockHasApiKey,
}));

function createAudioPlayerState(overrides: Partial<ReturnType<typeof createAudioPlayerMock>> = {}) {
  return createAudioPlayerMock(overrides);
}

function createAudioPlayerMock(
  overrides: Partial<{
    playbackState: {
      state: 'idle' | 'playing' | 'paused' | 'error';
      soundscapeId: string | null;
      loadedLayers: string[];
      failedLayers: string[];
      errorMessage: string | null;
      playbackPositionSeconds: number;
      playbackDurationSeconds: number;
      playbackProgress: number;
    };
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    setMasterVolume: ReturnType<typeof vi.fn>;
    setLayerVolume: ReturnType<typeof vi.fn>;
    setFadeInDuration: ReturnType<typeof vi.fn>;
    setDynamicEventsEnabled: ReturnType<typeof vi.fn>;
    enableAudio: ReturnType<typeof vi.fn>;
    isSupported: boolean | null;
  }> = {}
) {
  return {
    playbackState: {
      state: 'idle' as const,
      soundscapeId: null,
      loadedLayers: [],
      failedLayers: [],
      errorMessage: null,
      playbackPositionSeconds: 0,
      playbackDurationSeconds: 0,
      playbackProgress: 0,
    },
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    setMasterVolume: vi.fn(),
    setLayerVolume: vi.fn(),
    setFadeInDuration: vi.fn(),
    setDynamicEventsEnabled: vi.fn(),
    enableAudio: vi.fn().mockResolvedValue(undefined),
    isSupported: true,
    ...overrides,
  };
}

function createLocationContext(
  overrides: Partial<LocationContext> = {}
): LocationContext {
  return {
    cityName: 'Paris',
    regionName: 'Ile-de-France',
    countryName: 'France',
    regionType: 'city_center',
    coordinates: [48.8566, 2.3522],
    primaryLanguage: 'fr',
    languageVariant: 'fr-FR',
    secondaryLanguages: ['en'],
    timezone: 'Europe/Paris',
    currentLocalHour: 12,
    timeSlot: 'day',
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
    urbanDensity: 0.92,
    terrain: 'plain',
    nearWater: 'river',
    climate: 'temperate',
    economicLevel: 0.9,
    ...overrides,
  };
}

function createCachedSoundscape() {
  return {
    id: 'ready-cache',
    coordinates: [48.8566, 2.3522] as [number, number],
    timeSlot: 'day' as const,
    cityName: 'Paris',
    countryName: 'France',
    generatedAt: 1700000000000,
    playCount: 0,
    lastPlayedAt: 1700000000000,
    sizeBytes: 1024,
    audioBlobs: {
      ambient: new Blob(['ambient']),
    },
    recipe: {
      id: 'ready-cache',
      location: createLocationContext(),
      generatedAt: 1700000000000,
      localTimeAtGeneration: '12:00',
      layers: {
        ambient: {
          type: 'sfx',
          prompt: 'cafe terrace ambience',
          volume: 0.7,
          loop: true,
        },
        signature: {
          type: 'sfx',
          prompt: 'tram bell',
          volume: 0.5,
          loop: false,
          intervalSeconds: 45,
        },
        dialogue: {
          type: 'tts',
          model: 'eleven_v3',
          voiceId: 'voice-1',
          language: 'fr-FR',
          text: 'Bonjour',
          emotionTags: ['warm'],
          volume: 0.6,
          pan: -0.2,
          repeatIntervalSeconds: 60,
        },
        secondaryDialogue: {
          type: 'tts',
          model: 'eleven_v3',
          voiceId: 'voice-2',
          language: 'fr-FR',
          text: 'Salut',
          emotionTags: ['casual'],
          volume: 0.4,
          pan: 0.3,
          repeatIntervalSeconds: 75,
        },
        atmosphere: {
          type: 'music',
          prompt: 'soft accordion',
          volume: 0.3,
          loop: true,
        },
      },
      timeInterpolation: {
        sourceSlot: 'day',
        targetSlot: 'dusk',
        progress: 0.25,
        appliedParams: {
          activity: 0.7,
          traffic: 0.6,
          nature: 0.2,
          humanVoice: 0.8,
          music: 0.4,
        },
      },
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useSoundscapeSession deletion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedMarkers.mockResolvedValue([]);
    mockGetCachedSoundscape.mockResolvedValue(null);
    mockCacheSoundscape.mockResolvedValue(undefined);
    mockDeleteCachedSoundscape.mockResolvedValue(undefined);
    mockUpdatePlayStats.mockResolvedValue(undefined);
    mockAddLocationHistory.mockResolvedValue(1);
    mockGetLlmEnhancementConfig.mockReturnValue(null);
    mockEnrichSoundscapeNarrative.mockResolvedValue(null);
    mockHasApiKey.mockReturnValue(true);
    mockGenerateRecipe.mockImplementation((location: LocationContext) => ({
      id: 'generated-cache',
      location,
      generatedAt: 1700000000000,
      localTimeAtGeneration: '12:00',
      layers: {
        ambient: {
          type: 'sfx',
          prompt: 'ambient',
          volume: 0.7,
          loop: true,
        },
        signature: {
          type: 'sfx',
          prompt: 'signature',
          volume: 0.4,
          loop: false,
          intervalSeconds: 45,
        },
        dialogue: {
          type: 'tts',
          model: 'eleven_v3',
          voiceId: 'voice-1',
          language: 'fr-FR',
          text: 'Bonjour',
          emotionTags: ['warm'],
          volume: 0.5,
          pan: 0,
          repeatIntervalSeconds: 60,
        },
        secondaryDialogue: {
          type: 'tts',
          model: 'eleven_v3',
          voiceId: 'voice-2',
          language: 'fr-FR',
          text: 'Salut',
          emotionTags: ['calm'],
          volume: 0.4,
          pan: 0.2,
          repeatIntervalSeconds: 75,
        },
        atmosphere: {
          type: 'music',
          prompt: 'music',
          volume: 0.3,
          loop: true,
        },
      },
      timeInterpolation: {
        sourceSlot: 'day',
        targetSlot: 'dusk',
        progress: 0.3,
        appliedParams: {
          activity: 0.7,
          traffic: 0.6,
          nature: 0.2,
          humanVoice: 0.8,
          music: 0.4,
        },
      },
    }));
    mockGenerateSoundscapeAudio.mockResolvedValue({
      blobs: {
        ambient: new Blob(['ambient']),
      },
    });
    mockUseAudioPlayer.mockReturnValue(createAudioPlayerState());
  });

  test('deleting a ready entry removes it from the list and map pins', async () => {
    const stop = vi.fn();
    const cachedEntry = createCachedSoundscape();
    mockGetCachedMarkers.mockResolvedValueOnce([cachedEntry]).mockResolvedValue([]);
    mockUseAudioPlayer.mockReturnValue(
      createAudioPlayerState({
        playbackState: {
          state: 'playing',
          soundscapeId: 'ready-cache',
          loadedLayers: [],
          failedLayers: [],
          errorMessage: null,
          playbackPositionSeconds: 12,
          playbackDurationSeconds: 48,
          playbackProgress: 0.25,
        },
        stop,
      })
    );

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
      expect(result.current.mapPins).toHaveLength(1);
    });

    await act(async () => {
      await result.current.deleteLocationEntry({
        id: 'ready-cache',
        cacheKey: 'ready-cache',
        status: 'ready',
      });
    });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(mockDeleteCachedSoundscape).toHaveBeenCalledWith('ready-cache');

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(0);
      expect(result.current.mapPins).toHaveLength(0);
    });
  });

  test('deleting a loading job prevents it from reappearing after async generation resolves', async () => {
    const deferredLocation = createDeferred<LocationContext>();
    mockResolveLocation.mockReturnValue(deferredLocation.promise);

    const { result } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(48.8566, 2.3522);
    });

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
      expect(result.current.mapPins).toHaveLength(1);
    });

    const loadingEntry = result.current.locationEntries[0];

    await act(async () => {
      await result.current.deleteLocationEntry({
        id: loadingEntry.id,
        cacheKey: loadingEntry.cacheKey,
        status: loadingEntry.status,
      });
    });

    expect(result.current.locationEntries).toHaveLength(0);
    expect(result.current.mapPins).toHaveLength(0);

    await act(async () => {
      deferredLocation.resolve(createLocationContext());
      await deferredLocation.promise;
      await Promise.resolve();
    });

    expect(mockGetCachedSoundscape).not.toHaveBeenCalled();
    expect(mockCacheSoundscape).not.toHaveBeenCalled();
    expect(mockDeleteCachedSoundscape).not.toHaveBeenCalled();
    expect(result.current.locationEntries).toHaveLength(0);
    expect(result.current.mapPins).toHaveLength(0);
  });

  test('passes optional LLM narrative anchors into recipe generation when configured', async () => {
    const location = createLocationContext({
      cityName: 'Gdansk',
      countryName: 'Poland',
      cultureRegion: 'eastern_europe',
    });
    const anchors = {
      source: 'llm' as const,
      confidence: 0.82,
      cues: [
        {
          prompt: 'dock ropes straining against a canal boat near the old quays',
          label: {
            en: 'dock ropes by the quay',
            'zh-CN': '码头边的缆绳受力声',
          },
        },
      ],
      specificityInstruction:
        'Keep the scene recognisable as this riverside district and avoid generic city-center stock sounds.',
    };

    mockResolveLocation.mockResolvedValue(location);
    mockGetLlmEnhancementConfig.mockReturnValue({
      baseUrl: 'https://example.com/v1',
      model: 'gpt-test',
      apiKey: 'sk-test',
    });
    mockEnrichSoundscapeNarrative.mockResolvedValue(anchors);

    const { result } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(54.352, 18.6466);
    });

    await waitFor(() => {
      expect(mockGenerateRecipe).toHaveBeenCalledWith(location, {
        narrativeAnchors: anchors,
      });
    });
  });
});
