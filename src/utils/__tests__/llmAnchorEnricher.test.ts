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

  it('asks the model for a directly displayable narrative body for the selected place', () => {
    const messages = __private__.buildMessages(SAMPLE_CONTEXT, 'zh-CN');
    const systemMessage = messages[0]?.content ?? '';
    const userMessage = messages[1]?.content ?? '';

    expect(systemMessage).toContain(
      'Generate one short place-specific soundscape description'
    );
    expect(systemMessage).toContain('Return only the final body text');
    expect(systemMessage).toContain('Write in Simplified Chinese');
    expect(systemMessage).toContain('Write one short natural-language paragraph');
    expect(systemMessage).toContain('Target roughly 24 to 50 Chinese characters');
    expect(systemMessage).toContain('One or two sentences is enough.');
    expect(systemMessage).toContain('Do not reply with the place name');
    expect(userMessage).toContain('Output only the final short display paragraph');
    expect(userMessage).toContain('Keep it natural, specific, complete, and short.');
    expect(userMessage).toContain('Avoid long lists joined by commas.');
    expect(userMessage).toContain('Never output strings like "conversation 1", "Cues:", "Summary:"');
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

  it('drops appended location echoes from the displayed freeform summary', () => {
    const content = [
      'Canvas stalls are flapping in the noon wind while a truck unloads crates beside the market road.',
      'China, Qinghai, Dulan County',
      '(中国青海省都兰县).',
    ].join('\n');

    expect(
      __private__.normalizeFreeformAnchors(
        content,
        'en',
        {
          ...SAMPLE_CONTEXT,
          administrativeRegionName: 'Qinghai',
          cityName: 'Dulan County',
          regionName: 'Qinghai',
          countryName: 'China',
        }
      )
    ).toMatchObject({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en: 'Canvas stalls are flapping in the noon wind while a truck unloads crates beside the market road.',
        'zh-CN': '',
      },
      cues: [
        {
          prompt:
            'Canvas stalls are flapping in the noon wind while a truck unloads crates beside the market road',
          label: {
            en: 'Canvas stalls are flapping in the',
            'zh-CN': '',
          },
        },
      ],
      signature: {
        prompt:
          'Canvas stalls are flapping in the noon wind while a truck unloads crates beside the market road',
        label: {
          en: 'Canvas stalls are flapping in the',
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

  it('extracts only the narrative body from a scaffolded freeform LLM response', () => {
    const content = `1. Analyze the Request:
* Goal: Generate one short place-specific soundscape description.

2. Brainstorming Soundscape Details:
* Leizhou is in the tropics, on a plain.
* City center means bustling markets, street vendors, and tropical fruit sellers.
* Electric scooters hum past the curb while vendors call out prices in the local dialect.
* Audible details: chopping fruit, scooter tires over warm pavement.`;

    expect(
      __private__.normalizeFreeformAnchors(content, 'en', {
        ...SAMPLE_CONTEXT,
        administrativeRegionName: 'Guangdong',
        cityName: 'Leizhou',
        regionName: 'Zhanjiang',
        countryName: 'China',
        climate: 'tropical',
        terrain: 'plain',
      })
    ).toMatchObject({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en:
          'Leizhou is in the tropics, on a plain. City center means bustling markets, street vendors, and tropical fruit sellers. Electric scooters hum past the curb while vendors call out prices in the local dialect.',
        'zh-CN': '',
      },
      cues: [
        {
          prompt: 'Leizhou is in the tropics, on a plain',
          label: {
            en: 'Leizhou is in the tropics, on',
            'zh-CN': '',
          },
        },
        {
          prompt: 'City center means bustling markets, street vendors, and tropical fruit sellers',
          label: {
            en: 'City center means bustling markets, street',
            'zh-CN': '',
          },
        },
        {
          prompt:
            'Electric scooters hum past the curb while vendors call out prices in the local dialect',
          label: {
            en: 'Electric scooters hum past the curb',
            'zh-CN': '',
          },
        },
      ],
      signature: {
        prompt: 'Leizhou is in the tropics, on a plain',
        label: {
          en: 'Leizhou is in the tropics, on',
          'zh-CN': '',
        },
      },
    });
  });

  it('prioritizes the third brainstorm section over earlier analysis and location sections', () => {
    const content = `1. **Analyze the Request:**
* **Goal:** Generate one short place-specific soundscape description.
* **Location:** China, Sichuan, Shangyi (尚义镇 - Shangyi Town, located in Meishan, Sichuan, on the Chengdu Plain).

2. **Analyze the Location & Context:**
* *Shangyi, Sichuan:* A town on the western edge of the Chengdu Plain.
* *Day, plain, temperate, town:* Expect sounds of daily commerce, irrigation canals, bicycles, and local chatter.

3. **Brainstorm Audible Details (Local Character):**
* Sichuan dialect bargaining at the morning market.
* Clack of mahjong tiles from a roadside teahouse.
* Flowing water in the small canals/streams typical of the plain.
* Electric tricycles (三轮车).`;

    expect(
      __private__.normalizeFreeformAnchors(content, 'en', {
        ...SAMPLE_CONTEXT,
        administrativeRegionName: 'Sichuan',
        cityName: 'Shangyi',
        regionName: 'Meishan',
        countryName: 'China',
        regionType: 'town',
        terrain: 'plain',
      })
    ).toMatchObject({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en:
          'Sichuan dialect bargaining at the morning market. Clack of mahjong tiles from a roadside teahouse. Flowing water in the small canals/streams typical of the plain. Electric tricycles (三轮车).',
        'zh-CN': '',
      },
      cues: [
        {
          prompt: 'Sichuan dialect bargaining at the morning market',
        },
        {
          prompt: 'Clack of mahjong tiles from a roadside teahouse',
        },
        {
          prompt: 'Flowing water in the small canals/streams typical of the plain',
        },
      ],
      signature: {
        prompt: 'Sichuan dialect bargaining at the morning market',
      },
    });
  });

  it('keeps related preferred-section detail lines together for zh-CN mixed-script responses', () => {
    const content = `1. **Analyze the Request:**
* **Goal:** Generate one place-specific soundscape description paragraph for a task card.
* **Language:** Simplified Chinese (zh-CN).

2. **Determine Soundscape Elements for Changjiang, Jiangxi (Suburb, Day, Plain, Temperate):**
* *River/Water:* Chang River (昌江) - flowing water, gentle lapping, maybe a small boat engine.
* *Vehicles:* Electric scooters (very common in Jingdezhen suburbs), occasional delivery trucks, distant rumble of suburban traffic.
* *Markets/Shops/Routines:* Local breakfast stall sounds (steamer basket clinking, sizzling oil), vendors chatting in Jiangxi/Jingdezhen dialect, ceramic workshop sounds (faint clinking`;

    expect(
      __private__.normalizeFreeformAnchors(content, 'zh-CN', {
        ...SAMPLE_CONTEXT,
        administrativeRegionName: 'Jiangxi',
        cityName: 'Changjiang',
        regionName: 'Jingdezhen',
        countryName: 'China',
        regionType: 'city_suburb',
        terrain: 'plain',
      })
    ).toMatchObject({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en: '',
        'zh-CN':
          'Chang River (昌江) - flowing water, gentle lapping, maybe a small boat engine. Electric scooters (very common in Jingdezhen suburbs), occasional delivery trucks, distant rumble of suburban traffic. Local breakfast stall sounds (steamer basket clinking, sizzling oil), vendors chatting in Jiangxi/Jingdezhen dialect, ceramic workshop sounds (faint clinking',
      },
      cues: [
        {
          prompt: 'Chang River (昌江) - flowing water, gentle lapping, maybe a small boat engine',
        },
        {
          prompt:
            'Electric scooters (very common in Jingdezhen suburbs), occasional delivery trucks, distant rumble of suburban traffic',
        },
        {
          prompt:
            'Local breakfast stall sounds (steamer basket clinking, sizzling oil), vendors chatting in Jiangxi/Jingdezhen dialect, ceramic workshop sounds (faint clinking',
        },
      ],
      signature: {
        prompt: 'Chang River (昌江) - flowing water, gentle lapping, maybe a small boat engine',
      },
    });
  });

  it('returns null when the provider only returns reasoning-like prose without a body', async () => {
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

  it('normalizes list-like freeform responses down to the narrative body', () => {
    expect(
      __private__.normalizeFreeformAnchors(
        'Cues: 1. Bronze temple bell ringing across the valley. 2. Canvas tarps being folded.',
        'en'
      )
    ).toMatchObject({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en: 'Bronze temple bell ringing across the valley. Canvas tarps being folded.',
        'zh-CN': '',
      },
      cues: [
        {
          prompt: 'Bronze temple bell ringing across the valley',
          label: {
            en: 'Bronze temple bell ringing across the',
            'zh-CN': '',
          },
        },
        {
          prompt: 'Canvas tarps being folded',
          label: {
            en: 'Canvas tarps being folded',
            'zh-CN': '',
          },
        },
      ],
      signature: {
        prompt: 'Bronze temple bell ringing across the valley',
        label: {
          en: 'Bronze temple bell ringing across the',
          'zh-CN': '',
        },
      },
    });
  });

  it('keeps the full narrative body instead of truncating it to three sentences', () => {
    expect(
      __private__.normalizeFreeformAnchors(
        [
          'A butcher is chopping filling in the wet market.',
          'Vendors call out prices in a Beijing accent.',
          'Electric tricycles thread through the lane with short horn bursts.',
          'Water from the nearby park drifts into the background under a radio opera phrase.',
        ].join(' '),
        'en'
      )
    ).toMatchObject({
      source: 'llm',
      summary: {
        en:
          'A butcher is chopping filling in the wet market. Vendors call out prices in a Beijing accent. Electric tricycles thread through the lane with short horn bursts. Water from the nearby park drifts into the background under a radio opera phrase.',
        'zh-CN': '',
      },
    });
  });

  it('drops JSON summaries that only restate the location hierarchy', () => {
    expect(
      __private__.normalizeAnchors(
        {
          summary_en: 'China, Qinghai, Dulan County',
          cues: [
            {
              prompt_en: 'canvas stalls flapping in a county market wind',
              label_en: 'canvas stalls in the wind',
            },
          ],
        },
        {
          ...SAMPLE_CONTEXT,
          administrativeRegionName: 'Qinghai',
          cityName: 'Dulan County',
          regionName: 'Qinghai',
          countryName: 'China',
        }
      )
    ).toEqual({
      source: 'llm',
      confidence: 0.72,
      summary: undefined,
      cues: [
        {
          prompt: 'canvas stalls flapping in a county market wind',
          label: {
            en: 'canvas stalls in the wind',
            'zh-CN': 'canvas stalls in the wind',
          },
        },
      ],
      signature: undefined,
      atmosphereTone: undefined,
      specificityInstruction: undefined,
    });
  });

  it('extracts only the zh-CN narrative body while still extracting useful cues', () => {
    const content = `1.  **Analyze the Request:**
    *   **Goal:** Generate one short place-specific soundscape description.
    *   **Format:** Return ONLY the description text.
    *   **Language:** Simplified Chinese (zh-CN).

2.  **Analyze the Location & Context:**
    *   Longsha District is in Qiqihar, Heilongjiang.

3.  **Drafting the Soundscape (Iterative Process):**
    *   *Draft 1 (Mental):* 在龙沙区的郊区，嫩江边的水声轻轻拍着岸，早市上小贩用东北口音招呼来往行人。龙沙公园里不时传来麻将牌碰撞声，远处还夹着自行车铃和零散车流声。 "location: {cityName: 'Longsha', regionName: null, countryName: 'China'} raw: { choices: [] }`;

    const result = __private__.normalizeFreeformAnchors(content, 'zh-CN');

    expect(result).toMatchObject({
      source: 'llm',
      confidence: 0.72,
      summary: {
        en: '',
        'zh-CN': expect.any(String),
      },
      cues: [
        {
          prompt: '在龙沙区的郊区，嫩江边的水声轻轻拍着岸，早市上小贩用东北口音招呼来往行人',
          label: {
            en: '',
            'zh-CN': '在龙沙区的郊区嫩江边的水声轻轻拍着岸',
          },
        },
        {
          prompt: '龙沙公园里不时传来麻将牌碰撞声，远处还夹着自行车铃和零散车流声',
          label: {
            en: '',
            'zh-CN': '龙沙公园里不时传来麻将牌碰撞声远处还',
          },
        },
      ],
      signature: {
        prompt: '在龙沙区的郊区，嫩江边的水声轻轻拍着岸，早市上小贩用东北口音招呼来往行人',
        label: {
          en: '',
          'zh-CN': '在龙沙区的郊区嫩江边的水声轻轻拍着岸',
        },
      },
    });
    expect(result?.summary?.en).toBe('');
    expect(result?.summary?.['zh-CN']).toContain(result?.cues?.[0]?.prompt ?? '');
    expect(result?.summary?.['zh-CN']).toContain(result?.cues?.[1]?.prompt ?? '');
    expect(result?.summary?.['zh-CN']).not.toContain('Analyze the Request');
    expect(result?.summary?.['zh-CN']).not.toContain('raw:');
  });
});
