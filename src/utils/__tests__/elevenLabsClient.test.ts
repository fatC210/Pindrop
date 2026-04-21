import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGetApiKeyHeader } = vi.hoisted(() => ({
  mockGetApiKeyHeader: vi.fn(),
}));

vi.mock('@/utils/apiHeaders', () => ({
  getApiKeyHeader: mockGetApiKeyHeader,
}));

import {
  DEFAULT_RENDER_DURATION_SECONDS,
  MAX_SOUND_EFFECT_PROMPT_LENGTH,
  generateAmbientPreviewAudio,
  generateSoundscapeAudio,
} from '@/utils/elevenLabsClient';
import type { SoundscapeRecipe } from '@/types/soundscapeRecipe';

function createOkResponse(body = 'audio'): Response {
  return new Response(new Blob([body]), {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
    },
  });
}

function createRecipe(overrides: Partial<SoundscapeRecipe['layers']> = {}): SoundscapeRecipe {
  return {
    id: 'recipe-1',
    generatedAt: 1700000000000,
    localTimeAtGeneration: '12:00',
    location: {
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
    },
    layers: {
      ambient: {
        type: 'sfx',
        prompt: 'soft cafe terrace ambience',
        volume: 0.7,
        loop: true,
      },
      signature: {
        type: 'sfx',
        prompt: 'distant tram bell',
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
        pan: 0,
        repeatIntervalSeconds: 60,
      },
      secondaryDialogue: {
        type: 'tts',
        model: 'eleven_v3',
        voiceId: 'voice-2',
        language: 'fr-FR',
        text: '',
        emotionTags: ['calm'],
        volume: 0.4,
        pan: 0.2,
        repeatIntervalSeconds: 75,
      },
      atmosphere: {
        type: 'music',
        prompt: 'gentle accordion underscoring a riverside afternoon',
        volume: 0.3,
        loop: true,
      },
      ...overrides,
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
  };
}

describe('elevenLabsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiKeyHeader.mockReturnValue({
      'xi-api-key': 'test-elevenlabs-key',
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  test('routes ambient preview requests through the local ElevenLabs proxy', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createOkResponse());

    await generateAmbientPreviewAudio('gentle wind in pine trees');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/elevenlabs/sound-generation',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      })
    );

    const requestHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(requestHeaders.get('x-elevenlabs-api-key')).toBe('test-elevenlabs-key');
    expect(requestHeaders.get('content-type')).toBe('application/json');
  });

  test('uses the current music endpoint and payload shape for atmosphere generation', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          voices: [
            {
              voice_id: 'voice-1',
              verified_languages: [{ language: 'fr' }],
            },
          ],
        })
      )
      .mockResolvedValue(createOkResponse());

    await generateSoundscapeAudio(createRecipe());

    const musicCall = fetchMock.mock.calls.find(
      ([url]) => url === '/api/elevenlabs/music'
    );

    expect(musicCall).toBeTruthy();

    const musicRequest = musicCall?.[1] as RequestInit;
    const musicPayload = JSON.parse(String(musicRequest.body)) as {
      prompt: string;
      music_length_ms: number;
      model_id: string;
    };

    expect(musicPayload).toEqual({
      prompt: 'gentle accordion underscoring a riverside afternoon',
      music_length_ms: DEFAULT_RENDER_DURATION_SECONDS * 1000,
      model_id: 'music_v1',
    });
  });

  test('throws a clear error when the API key is missing', async () => {
    mockGetApiKeyHeader.mockReturnValue({});

    await expect(generateAmbientPreviewAudio('soft rain')).rejects.toThrow(
      'ElevenLabs API key not configured'
    );
  });

  test('trims long sound-effect prompts before calling the proxy', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createOkResponse());

    const overlongPrompt = Array.from({ length: 18 }, (_, index) =>
      `Sentence ${index + 1} describing one grounded local sound detail with realistic texture.`
    ).join(' ');

    await generateSoundscapeAudio(
      createRecipe({
        ambient: {
          type: 'sfx',
          prompt: overlongPrompt,
          volume: 0.7,
          loop: true,
        },
        signature: {
          type: 'sfx',
          prompt: overlongPrompt,
          volume: 0.5,
          loop: false,
          intervalSeconds: 45,
        },
        dialogue: {
          type: 'tts',
          model: 'eleven_v3',
          voiceId: 'voice-1',
          language: 'fr-FR',
          text: '',
          emotionTags: ['warm'],
          volume: 0.6,
          pan: 0,
          repeatIntervalSeconds: 60,
        },
        atmosphere: {
          type: 'music',
          prompt: '',
          volume: 0.3,
          loop: true,
        },
      })
    );

    const soundGenerationCalls = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/elevenlabs/sound-generation'
    );

    expect(soundGenerationCalls).toHaveLength(2);

    for (const [, request] of soundGenerationCalls) {
      const payload = JSON.parse(String((request as RequestInit).body)) as {
        text: string;
      };

      expect(payload.text.length).toBeLessThanOrEqual(MAX_SOUND_EFFECT_PROMPT_LENGTH);
      expect(payload.text.endsWith(' ')).toBe(false);
    }
  });
});
