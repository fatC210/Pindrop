import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LocationContext } from '@/types/locationContext';
import { enrichSoundscapeNarrative, __private__ } from '@/utils/soundscape/llmAnchorEnricher';

const SAMPLE_CONTEXT: LocationContext = {
  cityName: 'Kutaisi',
  regionName: 'Imereti',
  countryName: 'Georgia',
  regionType: 'city_center',
  coordinates: [42.2662, 42.718],
  primaryLanguage: 'ka',
  languageVariant: 'ka-GE',
  secondaryLanguages: ['ru'],
  timezone: 'Asia/Tbilisi',
  currentLocalHour: 11,
  timeSlot: 'day',
  cultureRegion: 'eastern_europe',
  dominantReligion: 'christianity',
  urbanDensity: 0.58,
  terrain: 'river',
  nearWater: 'river',
  climate: 'temperate',
  economicLevel: 0.52,
};

describe('llmAnchorEnricher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('builds a chat completions URL from a base URL', () => {
    expect(__private__.buildChatCompletionsUrl('https://api.openai.com/v1/')).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
    expect(
      __private__.buildChatCompletionsUrl('https://example.com/custom/chat/completions'),
    ).toBe('https://example.com/custom/chat/completions');
  });

  it('parses a JSON code fence and normalizes the returned anchors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `\`\`\`json
{
  "cues": [
    {
      "prompt_en": "river steps, market-side footsteps, and low bridge traffic",
      "label_en": "river steps and market footsteps",
      "label_zh_cn": "河边台阶与集市脚步声"
    }
  ],
  "signature": {
    "prompt_en": "one short burst of footsteps over worn riverside stone steps",
    "label_en": "steps on riverside stone",
    "label_zh_cn": "河边石阶脚步声"
  },
  "atmosphere_tone": "riverside market textures",
  "specificity_instruction": "Keep it grounded in the riverside district rather than a generic old town.",
  "confidence": 0.77
}
\`\`\``,
              },
            },
          ],
        }),
      }),
    );

    await expect(
      enrichSoundscapeNarrative(SAMPLE_CONTEXT, {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }),
    ).resolves.toEqual({
      source: 'llm',
      confidence: 0.77,
      cues: [
        {
          prompt: 'river steps, market-side footsteps, and low bridge traffic',
          label: {
            en: 'river steps and market footsteps',
            'zh-CN': '河边台阶与集市脚步声',
          },
        },
      ],
      signature: {
        prompt: 'one short burst of footsteps over worn riverside stone steps',
        label: {
          en: 'steps on riverside stone',
          'zh-CN': '河边石阶脚步声',
        },
      },
      atmosphereTone: 'riverside market textures',
      specificityInstruction:
        'Keep it grounded in the riverside district rather than a generic old town.',
    });
  });

  it('returns null when the model signals low confidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  cues: [
                    {
                      prompt_en: 'generic street ambience',
                      label_en: 'generic street ambience',
                      label_zh_cn: '泛化街头环境声',
                    },
                  ],
                  confidence: 0.2,
                }),
              },
            },
          ],
        }),
      }),
    );

    await expect(
      enrichSoundscapeNarrative(SAMPLE_CONTEXT, {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }),
    ).resolves.toBeNull();
  });
});
