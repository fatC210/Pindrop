import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LocationContext } from '@/types/locationContext';
import { __private__, enrichSoundscapeNarrative } from '@/utils/soundscape/llmAnchorEnricher';

const SAMPLE_CONTEXT: LocationContext = {
  administrativeRegionName: 'Imereti',
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
      'https://api.openai.com/v1/chat/completions'
    );
    expect(
      __private__.buildChatCompletionsUrl('https://example.com/custom/chat/completions')
    ).toBe('https://example.com/custom/chat/completions');
  });

  it('asks the model for structured summaries and cue prompts for the selected place', () => {
    const messages = __private__.buildMessages(SAMPLE_CONTEXT, 'zh-CN');
    const systemMessage = messages[0]?.content ?? '';
    const userMessage = messages[1]?.content ?? '';

    expect(systemMessage).toContain('Return only the description text');
    expect(systemMessage).toContain('Write in Simplified Chinese');
    expect(userMessage).toContain('Keep it concise, natural, and complete.');
    expect(userMessage).toContain('Never output strings like "conversation 1", "Cues:"');
    expect(userMessage).toContain('Location: Georgia, Imereti, Kutaisi');
    expect(userMessage).toContain('Context: time: day; terrain: river; near water: river');
  });

  it('parses a JSON code fence and normalizes the returned anchors even without confidence', async () => {
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
  "summary_en": "Stone steps and market footsteps gather by the river while low bridge traffic drifts across Kutaisi.",
  "summary_zh_cn": "\\u5e93\\u5854\\u4f0a\\u897f\\u6cb3\\u8fb9\\u7684\\u77f3\\u9636\\u811a\\u6b65\\u58f0\\u548c\\u96c6\\u5e02\\u4eba\\u6d41\\u4ea4\\u7ec7\\u5728\\u4e00\\u8d77\\uff0c\\u4f4e\\u4f4e\\u7684\\u6865\\u4e0a\\u8f66\\u6d41\\u4ece\\u8fdc\\u5904\\u63a0\\u8fc7\\u3002",
  "cues": [
    {
      "prompt_en": "river steps, market-side footsteps, and low bridge traffic",
      "label_en": "river steps and market footsteps",
      "label_zh_cn": "\\u6cb3\\u8fb9\\u53f0\\u9636\\u4e0e\\u96c6\\u5e02\\u811a\\u6b65\\u58f0"
    }
  ],
  "signature": {
    "prompt_en": "one short burst of footsteps over worn riverside stone steps",
    "label_en": "steps on riverside stone",
    "label_zh_cn": "\\u6cb3\\u8fb9\\u77f3\\u9636\\u811a\\u6b65\\u58f0"
  },
  "atmosphere_tone": "riverside market textures",
  "specificity_instruction": "Keep it grounded in the riverside district rather than a generic old town."
}
\`\`\``,
              },
            },
          ],
        }),
      })
    );

    await expect(
      enrichSoundscapeNarrative(SAMPLE_CONTEXT, {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }, 'en')
    ).resolves.toEqual({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en: 'Stone steps and market footsteps gather by the river while low bridge traffic drifts across Kutaisi.',
        'zh-CN':
          '库塔伊西河边的石阶脚步声和集市人流交织在一起，低低的桥上车流从远处掠过。',
      },
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

  it('falls back to freeform narrative anchors when the model returns prose instead of JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Rafts push slowly across the river surface. A bamboo pole lands with a dull knock in the water. Birds echo off the cliff while a distant boatman calls out once.',
              },
            },
          ],
        }),
      })
    );

    await expect(
      enrichSoundscapeNarrative(SAMPLE_CONTEXT, {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }, 'en')
    ).resolves.toEqual({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en: 'Rafts push slowly across the river surface. A bamboo pole lands with a dull knock in the water. Birds echo off the cliff while a distant boatman calls out once.',
        'zh-CN': '',
      },
      cues: [
        {
          prompt: 'Rafts push slowly across the river surface',
          label: {
            en: 'Rafts push slowly across the river',
            'zh-CN': '',
          },
        },
        {
          prompt: 'A bamboo pole lands with a dull knock in the water',
          label: {
            en: 'A bamboo pole lands with a',
            'zh-CN': '',
          },
        },
        {
          prompt: 'Birds echo off the cliff while a distant boatman calls out once',
          label: {
            en: 'Birds echo off the cliff while',
            'zh-CN': '',
          },
        },
      ],
      signature: {
        prompt: 'Rafts push slowly across the river surface',
        label: {
          en: 'Rafts push slowly across the river',
          'zh-CN': '',
        },
      },
    });
  });

  it('prefers non-reasoning content parts when the provider returns mixed content blocks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: [
                  {
                    type: 'reasoning',
                    text:
                      'The user wants a JSON object for a soundscape narrative anchor. Let me think about this location first.',
                  },
                  {
                    type: 'text',
                    text: `{
  "summary_en": "A ferryman taps the side of the raft while water folds softly under the oars.",
  "summary_zh_cn": "竹筏边被轻轻敲响，桨叶划过水面时带起细碎水声。",
  "cues": [
    {
      "prompt_en": "wooden raft taps and soft oar strokes on the river",
      "label_en": "raft taps and oars",
      "label_zh_cn": "竹筏敲击与桨声"
    }
  ]
}`,
                  },
                ],
              },
            },
          ],
        }),
      })
    );

    await expect(
      enrichSoundscapeNarrative(SAMPLE_CONTEXT, {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }, 'en')
    ).resolves.toMatchObject({
      source: 'llm',
      summary: {
        en: 'A ferryman taps the side of the raft while water folds softly under the oars.',
        'zh-CN': '竹筏边被轻轻敲响，桨叶划过水面时带起细碎水声。',
      },
      cues: [
        {
          prompt: 'wooden raft taps and soft oar strokes on the river',
        },
      ],
    });
  });

  it('returns null when the provider only echoes reasoning or prompt scaffolding', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'The user wants a JSON object for a soundscape narrative anchor. Let me think about this location. Return a JSON object. Requirements: keep it local. Location: China, Heilongjiang, Lindian County, Hongqi. Context: time: dusk; terrain: plain.',
              },
            },
          ],
        }),
      })
    );

    await expect(
      enrichSoundscapeNarrative(SAMPLE_CONTEXT, {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
        apiKey: 'sk-test',
      }, 'en')
    ).resolves.toBeNull();
  });

  it('rejects list-like freeform summaries that are not safe to show in the card', () => {
    expect(
      __private__.normalizeFreeformAnchors(
        'Cues: 1. Bronze temple bell ringing across the valley. 2. Canvas tarps being folded.',
        'en'
      )
    ).toBeNull();
  });
});
