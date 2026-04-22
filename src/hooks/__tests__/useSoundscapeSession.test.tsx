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
  mockLocaleState,
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
  mockLocaleState: { value: 'en' as 'en' | 'zh-CN' },
}));

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: mockLocaleState.value,
    messages: getMessages(mockLocaleState.value),
    setLocale: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: mockUseAudioPlayer,
}));

vi.mock('@/components/settings/preferencesStore', () => ({
  PREFERENCES_UPDATED_EVENT: 'pindrop:preferences-updated',
  arePreferencesEqual: (left: unknown, right: unknown) =>
    JSON.stringify(left) === JSON.stringify(right),
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
  generateDynamicEventAudio: vi.fn(),
  generateSoundscapeAudio: mockGenerateSoundscapeAudio,
}));

vi.mock('@/utils/soundscape/llmAnchorEnricher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/soundscape/llmAnchorEnricher')>();

  return {
    ...actual,
    enrichSoundscapeNarrative: mockEnrichSoundscapeNarrative,
  };
});

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
    administrativeRegionName: 'Ile-de-France',
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
    cityName: 'Kutaisi',
    countryName: 'Georgia',
    generatedAt: 1700000000000,
    playCount: 0,
    lastPlayedAt: 1700000000000,
    sizeBytes: 1024,
    audioBlobs: {
      ambient: new Blob(['ambient']),
    },
    recipe: {
      id: 'ready-cache',
      location: createLocationContext({
        cityName: 'Kutaisi',
        regionName: 'Imereti',
        countryName: 'Georgia',
        cultureRegion: 'eastern_europe',
        nearWater: 'river',
      }),
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
      narrativeAnchors: {
        source: 'llm',
        confidence: 0.91,
        summary: {
          en: 'A riverside bookseller is setting out paperbacks while accordion phrases drift across the quay.',
          'zh-CN': '\u6cb3\u5cb8\u65e7\u4e66\u644a\u6b63\u5728\u6446\u51fa\u7eb8\u8d28\u4e66\u672c\uff0c\u624b\u98ce\u7434\u7247\u6bb5\u5728\u7801\u5934\u8fb9\u8f7b\u8f7b\u98d8\u5f00\u3002',
        },
        signature: {
          prompt: 'accordion phrases curling out from a riverside book market',
          label: {
            en: 'riverside accordion phrases',
            'zh-CN': '\u6cb3\u7554\u624b\u98ce\u7434\u7247\u6bb5',
          },
        },
        cues: [
          {
            prompt: 'accordion phrases curling out from a riverside book market',
            label: {
              en: 'riverside accordion phrases',
              'zh-CN': '\u6cb3\u7554\u624b\u98ce\u7434\u7247\u6bb5',
            },
          },
          {
            prompt: 'bookstalls opening along the river walk',
            label: {
              en: 'opening bookstalls',
              'zh-CN': '\u521d\u5f00\u7684\u4e66\u644a',
            },
          },
          {
            prompt: 'paperbacks thudding onto a folding stand',
            label: {
              en: 'paperbacks on a folding stand',
              'zh-CN': '\u7eb8\u8d28\u4e66\u672c\u653e\u4e0a\u6298\u53e0\u4e66\u67b6\u58f0',
            },
          },
          {
            prompt: 'low quay footsteps brushing past the stall',
            label: {
              en: 'low quay footsteps',
              'zh-CN': '\u7801\u5934\u8fb9\u7684\u811a\u6b65\u58f0',
            },
          },
        ],
      },
      promptVersion: 2,
      interfaceLocale: 'en',
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
    const cachedEntries = new Map<string, ReturnType<typeof createCachedSoundscape>>();

    vi.clearAllMocks();
    mockLocaleState.value = 'en';
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('navigator', { userAgent: 'jsdom' });
    mockGetCachedMarkers.mockImplementation(async () => Array.from(cachedEntries.values()));
    mockGetCachedSoundscape.mockImplementation(async (cacheKey: string) => cachedEntries.get(cacheKey) ?? null);
    mockCacheSoundscape.mockImplementation(async (cacheKey: string, value: Record<string, unknown>) => {
      cachedEntries.set(cacheKey, {
        id: cacheKey,
        coordinates: value.coordinates as [number, number],
        timeSlot: value.timeSlot as 'day',
        administrativeRegionName: value.administrativeRegionName as string | undefined,
        cityName: value.cityName as string,
        regionName: value.regionName as string | undefined,
        countryName: value.countryName as string,
        generatedAt: value.generatedAt as number,
        playCount: value.playCount as number,
        lastPlayedAt: value.lastPlayedAt as number,
        sizeBytes: value.sizeBytes as number,
        playbackDurationSeconds: value.playbackDurationSeconds as number,
        audioBlobs: value.audioBlobs as { ambient?: Blob; atmosphere?: Blob; signature?: Blob },
        recipe: value.recipe,
      } as ReturnType<typeof createCachedSoundscape>);
    });
    mockDeleteCachedSoundscape.mockImplementation(async (cacheKey: string) => {
      cachedEntries.delete(cacheKey);
    });
    mockUpdatePlayStats.mockResolvedValue(undefined);
    mockAddLocationHistory.mockResolvedValue(1);
    mockGetLlmEnhancementConfig.mockReturnValue({
      baseUrl: 'https://example.com/v1',
      model: 'gpt-test',
      apiKey: 'sk-test',
    });
    mockEnrichSoundscapeNarrative.mockResolvedValue({
      source: 'llm',
      confidence: 0.82,
      summary: {
        en: 'A market stall is rolling up its shutter and setting out bowls while the lane wakes up.',
        'zh-CN': '\u4e00\u4e2a\u644a\u4f4d\u6b63\u5728\u62c9\u8d77\u5377\u95f8\u95e8\u5e76\u6446\u51fa\u7897\u76cf\uff0c\u5c0f\u5df7\u4e5f\u8ddf\u7740\u9192\u6765\u3002',
      },
      cues: [
        {
          prompt: 'one market stall rolling up a metal shutter and setting out bowls',
          label: {
            en: 'a market stall opening',
            'zh-CN': '一个摊位拉起卷闸门准备开张',
          },
        },
      ],
    });
    mockHasApiKey.mockReturnValue(true);
    mockGenerateRecipe.mockImplementation((
      location: LocationContext,
      options?: {
        narrativeAnchors?: unknown;
        interfaceLocale?: 'en' | 'zh-CN';
      }
    ) => ({
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
      narrativeAnchors: options?.narrativeAnchors,
      interfaceLocale: options?.interfaceLocale,
    }));
    mockGenerateSoundscapeAudio.mockResolvedValue({
      blobs: {
        ambient: new Blob(['ambient']),
      },
    });
    mockUseAudioPlayer.mockReturnValue(createAudioPlayerState());
  });

  test('ignores preference update events when the stored preferences did not change', async () => {
    const audioPlayerState = createAudioPlayerState();
    mockUseAudioPlayer.mockReturnValue(audioPlayerState);

    renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(audioPlayerState.setMasterVolume).toHaveBeenCalledTimes(1);
      expect(audioPlayerState.setDynamicEventsEnabled).toHaveBeenCalledTimes(1);
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('pindrop:preferences-updated'));
    });

    await waitFor(() => {
      expect(audioPlayerState.setMasterVolume).toHaveBeenCalledTimes(1);
      expect(audioPlayerState.setDynamicEventsEnabled).toHaveBeenCalledTimes(1);
    });
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

  test('passes required LLM narrative anchors into recipe generation', async () => {
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
        interfaceLocale: 'en',
      });
    });
    expect(mockEnrichSoundscapeNarrative).toHaveBeenCalledWith(
      location,
      expect.objectContaining({
        baseUrl: 'https://example.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }),
      'en'
    );
    expect(result.current.locationEntries.every((entry) => entry.narrativeSource !== 'rules')).toBe(
      true
    );
  });

  test('falls back to rule-based prompts when the LLM does not return a usable narrative', async () => {
    const location = createLocationContext({
      cityName: 'Shitan',
      regionName: 'Xiangtan County',
      countryName: 'China',
      cultureRegion: 'east_asia',
      regionType: 'town',
    });

    mockResolveLocation.mockResolvedValue(location);
    mockEnrichSoundscapeNarrative.mockResolvedValue(null);
    mockGenerateSoundscapeAudio.mockResolvedValue({
      blobs: {
        ambient: new Blob(['ambient']),
      },
      failedLayers: [],
      failureMessages: {},
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(27.83, 112.95);
    });

    await waitFor(() => {
      expect(result.current.locationEntries[0]?.status).toBe('ready');
    });

    expect(mockGenerateRecipe).toHaveBeenCalledWith(location, {
      narrativeAnchors: expect.objectContaining({
        source: 'rules',
        fallbackReasonCode: 'llm_unavailable',
      }),
      interfaceLocale: 'en',
    });
    expect(result.current.locationEntries[0]?.narrativeSource).toBe('rules');
    expect(result.current.locationEntries[0]?.fallbackNotice).toContain(
      'Using fallback scene because the LLM did not return a usable place-specific narrative.'
    );
    expect(result.current.locationEntries[0]?.errorMessage).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PinDrop Warning] LLM narrative unavailable, falling back to rules:',
      expect.objectContaining({
        message:
          'PinDrop could not get a concrete place-specific scene from the LLM, so generation was stopped.',
      })
    );

    consoleWarnSpy.mockRestore();
  });

  test('falls back to rule-based prompts when the LLM request throws', async () => {
    const location = createLocationContext({
      cityName: 'Reykjavik',
      regionName: 'Capital Region',
      countryName: 'Iceland',
      cultureRegion: 'western_europe',
      nearWater: 'sea',
      terrain: 'coast',
    });

    mockResolveLocation.mockResolvedValue(location);
    mockEnrichSoundscapeNarrative.mockRejectedValue(new Error('LLM upstream timeout'));
    mockGenerateSoundscapeAudio.mockResolvedValue({
      blobs: {
        ambient: new Blob(['ambient']),
      },
      failedLayers: [],
      failureMessages: {},
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(64.1466, -21.9426);
    });

    await waitFor(() => {
      expect(result.current.locationEntries[0]?.status).toBe('ready');
    });

    expect(mockGenerateRecipe).toHaveBeenCalledWith(location, {
      narrativeAnchors: expect.objectContaining({
        source: 'rules',
        fallbackReasonCode: 'llm_request_failed',
      }),
      interfaceLocale: 'en',
    });
    expect(result.current.locationEntries[0]?.narrativeSource).toBe('rules');
    expect(result.current.locationEntries[0]?.fallbackNotice).toContain(
      'Using fallback scene because the LLM request failed: LLM upstream timeout'
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PinDrop Warning] LLM narrative request failed, falling back to rules:',
      expect.objectContaining({
        errorDetails: expect.objectContaining({
          message: 'LLM upstream timeout',
        }),
      })
    );

    consoleWarnSpy.mockRestore();
  });

  test('surfaces detailed ElevenLabs layer failures instead of a generic no-audio error', async () => {
    mockResolveLocation.mockResolvedValue(createLocationContext());
    mockGenerateSoundscapeAudio.mockResolvedValue({
      blobs: {},
      failedLayers: ['ambient', 'atmosphere'],
      failureMessages: {
        ambient: 'Ambient generation failed: ElevenLabs request failed (429): quota exceeded',
        atmosphere:
          'Atmosphere generation failed: ElevenLabs request failed (403): plan upgrade required',
      },
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(48.8566, 2.3522);
    });

    await waitFor(() => {
      expect(result.current.locationEntries[0]?.status).toBe('error');
    });

    expect(result.current.locationEntries[0]?.errorMessage).toBe(
      'Ambient generation failed: ElevenLabs request failed (429): quota exceeded | Atmosphere generation failed: ElevenLabs request failed (403): plan upgrade required'
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PinDrop Warning] Soundscape generation failed:',
      expect.objectContaining({
        message:
          'Ambient generation failed: ElevenLabs request failed (429): quota exceeded | Atmosphere generation failed: ElevenLabs request failed (403): plan upgrade required',
        errorDetails: expect.objectContaining({
          message:
            'Ambient generation failed: ElevenLabs request failed (429): quota exceeded | Atmosphere generation failed: ElevenLabs request failed (403): plan upgrade required',
        }),
      })
    );

    consoleWarnSpy.mockRestore();
  });

  test('does not expose cached entries that only contain short non-bed fragments', async () => {
    const invalidCachedEntry = {
      ...createCachedSoundscape(),
      id: 'short-only-cache',
      audioBlobs: {
        signature: new Blob(['signature']),
      },
    };

    mockGetCachedMarkers.mockResolvedValueOnce([invalidCachedEntry]).mockResolvedValue([]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(0);
      expect(result.current.mapPins).toHaveLength(0);
    });

    expect(mockDeleteCachedSoundscape).toHaveBeenCalledWith('short-only-cache');
  });

  test('shows the LLM-generated description instead of the raw atmosphere prompt for cached entries', async () => {
    mockGetCachedMarkers.mockResolvedValue([createCachedSoundscape()]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    expect(result.current.locationEntries[0]?.sceneDescription).toBe(
      'riverside accordion phrases / opening bookstalls / paperbacks on a folding stand'
    );
    expect(result.current.locationEntries[0]?.sceneDescription).not.toBe('soft accordion');
  });

  test('strips cached dialogue blobs before playback so old spoken layers do not play', async () => {
    const cachedEntry = {
      ...createCachedSoundscape(),
      audioBlobs: {
        ambient: new Blob(['ambient']),
        dialogue: new Blob(['spoken']),
        secondaryDialogue: new Blob(['spoken-2']),
        atmosphere: new Blob(['music']),
      },
    };
    const play = vi.fn().mockResolvedValue(undefined);
    mockGetCachedMarkers.mockResolvedValue([cachedEntry]);
    mockGetCachedSoundscape.mockResolvedValue(cachedEntry);
    mockUseAudioPlayer.mockReturnValue(
      createAudioPlayerState({
        play,
      })
    );

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    await act(async () => {
      await result.current.playLocation('ready-cache');
    });

    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ready-cache' }),
      expect.objectContaining({
        ambient: expect.any(Blob),
        atmosphere: expect.any(Blob),
      })
    );

    const passedBlobs = play.mock.calls[0]?.[1] as Record<string, Blob | undefined>;
    expect(passedBlobs.dialogue).toBeUndefined();
    expect(passedBlobs.secondaryDialogue).toBeUndefined();
  });

  test('shows the LLM-generated description while a location is still rendering', async () => {
    const deferredAudio = createDeferred<{ blobs: { ambient: Blob } }>();
    mockResolveLocation.mockResolvedValue(createLocationContext());
    mockGenerateSoundscapeAudio.mockReturnValue(deferredAudio.promise);

    const { result } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(48.8566, 2.3522);
    });

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
      expect(result.current.locationEntries[0]?.status).toBe('loading');
      expect(result.current.locationEntries[0]?.sceneDescription).toContain('a market stall');
    });

    await act(async () => {
      deferredAudio.resolve({
        blobs: {
          ambient: new Blob(['ambient']),
        },
      });
      await deferredAudio.promise;
    });
  });

  test('recomputes the LLM description in Chinese when the interface locale is Chinese', async () => {
    mockLocaleState.value = 'zh-CN';
    mockGetCachedMarkers.mockResolvedValue([createCachedSoundscape()]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    expect(result.current.locationEntries[0]?.sceneDescription).toBe(
      '\u6cb3\u7554\u624b\u98ce\u7434\u7247\u6bb5 / \u521d\u5f00\u7684\u4e66\u644a / \u7eb8\u8d28\u4e66\u672c\u653e\u4e0a\u6298\u53e0\u4e66\u67b6\u58f0'
    );
  });

  test('strips mixed-language cue labels down to Chinese when the interface locale is Chinese', async () => {
    mockLocaleState.value = 'zh-CN';
    mockGetCachedMarkers.mockResolvedValue([
      {
        ...createCachedSoundscape(),
        recipe: {
          ...createCachedSoundscape().recipe,
          narrativeAnchors: {
            source: 'llm',
            confidence: 0.91,
            summary: {
              en: '',
              'zh-CN': '',
            },
            cues: [
              {
                prompt: 'distant traffic hum',
                label: {
                  en: 'distant traffic hum',
                  'zh-CN': 'Anchor Distant traffic hum (远处车流的低鸣)',
                },
              },
              {
                prompt: 'crickets at night',
                label: {
                  en: 'night insects',
                  'zh-CN':
                    'Anchor Crickets/night insects (秋虫在草丛中鸣叫 / 草丛里的虫鸣)',
                },
              },
              {
                prompt: 'stream water nearby',
                label: {
                  en: 'stream water nearby',
                  'zh-CN': 'Anchor Stream water nearby (近处溪水声)',
                },
              },
            ],
          },
        },
      },
    ]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    expect(result.current.locationEntries[0]?.sceneDescription).toBe(
      '远处车流的低鸣 / 秋虫在草丛中鸣叫 / 近处溪水声'
    );
    expect(result.current.locationEntries[0]?.sceneDescription).not.toMatch(/[A-Za-z]/);
  });

  test('falls back to the other cached narrative language when the active locale version is missing', async () => {
    mockLocaleState.value = 'en';
    mockGetCachedMarkers.mockResolvedValue([
      {
        ...createCachedSoundscape(),
        recipe: {
          ...createCachedSoundscape().recipe,
          interfaceLocale: undefined,
          narrativeAnchors: {
            ...createCachedSoundscape().recipe.narrativeAnchors,
            summary: {
              en: '',
              'zh-CN':
                '\u6cb3\u5cb8\u65e7\u4e66\u644a\u6b63\u5728\u6446\u51fa\u7eb8\u8d28\u4e66\u672c\uff0c\u624b\u98ce\u7434\u7247\u6bb5\u5728\u7801\u5934\u8fb9\u8f7b\u8f7b\u98d8\u5f00\u3002',
            },
            cues: [
              {
                prompt: 'riverbank old bookseller opening the stall',
                label: {
                  en: '',
                  'zh-CN': '\u6cb3\u5cb8\u65e7\u4e66\u644a',
                },
              },
              {
                prompt: 'accordion phrases over the quay',
                label: {
                  en: '',
                  'zh-CN': '\u624b\u98ce\u7434\u7247\u6bb5',
                },
              },
              {
                prompt: 'paperbacks sliding onto the stand',
                label: {
                  en: '',
                  'zh-CN': '\u7eb8\u8d28\u4e66\u672c\u58f0',
                },
              },
            ],
          },
        },
      },
    ]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    expect(result.current.locationEntries[0]?.sceneDescription).toBe(
      'riverbank old bookseller opening the stall / accordion phrases over the quay / paperbacks sliding onto the stand'
    );
  });

  test('pins a newly generated card to the interface locale that was active at generation time', async () => {
    mockLocaleState.value = 'zh-CN';
    const deferredAudio = createDeferred<{ blobs: { ambient: Blob } }>();
    mockResolveLocation.mockResolvedValue(createLocationContext({
      cityName: 'Shitan',
      regionName: 'Xiangtan County',
      countryName: 'China',
      cultureRegion: 'east_asia',
      regionType: 'town',
      administrativeRegionName: 'Hunan',
    }));
    mockEnrichSoundscapeNarrative.mockResolvedValue({
      source: 'llm',
      confidence: 0.82,
      summary: {
        en: 'A stream moves beside the lane while a scooter passes the closing shops.',
        'zh-CN': '\u6eaa\u6c34\u5728\u8857\u5df7\u4e00\u4fa7\u6d41\u8fc7\uff0c\u4e00\u8f86\u6469\u6258\u8f66\u63a0\u8fc7\u5c06\u8981\u6253\u70ca\u7684\u5c0f\u5e97\u3002',
      },
      cues: [
        {
          prompt: 'stream water and one scooter passing near closing shops',
          label: {
            en: 'stream water and a scooter',
            'zh-CN': '\u6eaa\u6c34\u4e0e\u6469\u6258\u8f66\u58f0',
          },
        },
        {
          prompt: 'a bicycle bell from deeper in the lane',
          label: {
            en: 'a bicycle bell',
            'zh-CN': '\u81ea\u884c\u8f66\u94c3\u58f0',
          },
        },
        {
          prompt: 'shop shutters settling down for the evening',
          label: {
            en: 'shop shutters settling',
            'zh-CN': '\u5377\u5e18\u95e8\u58f0',
          },
        },
      ],
    });
    mockGenerateSoundscapeAudio.mockReturnValue(deferredAudio.promise);

    const { result, rerender } = renderHook(() => useSoundscapeSession());

    await act(async () => {
      await result.current.handleCoordinateSelect(27.83, 112.95);
    });

    await waitFor(() => {
      expect(result.current.locationEntries.some((entry) => entry.status === 'loading')).toBe(true);
    });

    mockLocaleState.value = 'en';
    rerender();

    await waitFor(() => {
      expect(result.current.locationEntries[0]?.displayLocale).toBe('zh-CN');
      expect(result.current.locationEntries[0]?.sceneDescription).toBe(
        'stream water and a scooter / a bicycle bell / shop shutters settling'
      );
      expect(result.current.locationEntries[0]?.administrativeRegionName).toBe('Hunan');
    });

    await act(async () => {
      deferredAudio.resolve({
        blobs: {
          ambient: new Blob(['ambient']),
        },
      });
      await deferredAudio.promise;
    });
  });

  test('does not show a description when cached LLM text does not match the interface language', async () => {
    mockLocaleState.value = 'zh-CN';
    mockGetCachedMarkers.mockResolvedValue([
      {
        ...createCachedSoundscape(),
        recipe: {
          ...createCachedSoundscape().recipe,
          narrativeAnchors: {
            source: 'llm',
            confidence: 0.91,
            summary: {
              en: 'Cues: 1. Bronze temple bell ringing across the valley. 2. Canvas tarps being folded.',
              'zh-CN':
                'Cues: 1. Bronze temple bell ringing across the valley. 2. Canvas tarps being folded.',
            },
            cues: [
              {
                prompt: 'bronze temple bell ringing across the valley',
                label: {
                  en: 'bronze temple bell',
                  'zh-CN': 'bronze temple bell',
                },
              },
            ],
          },
        },
      },
    ]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    expect(result.current.locationEntries[0]?.sceneDescription).toBeUndefined();
  });

  test('re-sanitizes cached narrative summaries before showing them in the list', async () => {
    mockLocaleState.value = 'en';
    mockGetCachedMarkers.mockResolvedValue([
      {
        ...createCachedSoundscape(),
        recipe: {
          ...createCachedSoundscape().recipe,
          narrativeAnchors: {
            ...createCachedSoundscape().recipe.narrativeAnchors,
            summary: {
              en:
                'Dusk wind sweeps the plain as yaks low in the distance. A passing motorcycle rumbles while a nearby stream murmurs softly near closing shops. *Draft 2:* Evening wind sweeps the high plain as yaks low softly. A distant motorcycle rumbles past closing shops while a cold stream murmurs nearby. *Draft 3:* Wind sweeps the dusk plain as yaks low in the distance. A motorcycle rumbles past closing storefronts while a nearby stream murmurs softly. Generate a short place-specific soundscape description for a task card. Return only the final body text, no JSON, no markdown.',
              'zh-CN': '',
            },
            cues: [],
          },
        },
      },
    ]);

    const { result } = renderHook(() => useSoundscapeSession());

    await waitFor(() => {
      expect(result.current.locationEntries).toHaveLength(1);
    });

    expect(result.current.locationEntries[0]?.sceneDescription).toBe(
      'Wind sweeps the dusk plain as yaks low in the distance. A motorcycle rumbles past closing storefronts while a nearby stream murmurs softly.'
    );
  });

});
