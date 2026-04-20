import type { LocationContext } from '@/types/locationContext';
import type {
  NarrativeAnchorCue,
  SoundscapeNarrativeAnchors,
} from '@/types/soundscapeRecipe';
import type { LlmEnhancementConfig } from '@/components/settings/preferencesStore';

const MIN_CONFIDENCE = 0.45;

interface RawCuePayload {
  prompt_en?: string;
  label_en?: string;
  label_zh_cn?: string;
}

interface RawAnchorPayload {
  cues?: RawCuePayload[];
  signature?: RawCuePayload;
  atmosphere_tone?: string;
  specificity_instruction?: string;
  confidence?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function extractContent(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? '')
      .join('')
      .trim();
  }

  return '';
}

function stripCodeFence(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return content;
}

function parseJsonObject(content: string): RawAnchorPayload | null {
  const stripped = stripCodeFence(content);

  try {
    return JSON.parse(stripped) as RawAnchorPayload;
  } catch {
    const firstBrace = stripped.indexOf('{');
    const lastBrace = stripped.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(stripped.slice(firstBrace, lastBrace + 1)) as RawAnchorPayload;
    } catch {
      return null;
    }
  }
}

function normalizeCue(payload: RawCuePayload | undefined): NarrativeAnchorCue | null {
  if (!payload) {
    return null;
  }

  const prompt = payload.prompt_en?.trim() ?? '';
  const labelEn = payload.label_en?.trim() ?? '';
  const labelZhCn = payload.label_zh_cn?.trim() ?? '';

  if (!prompt || !labelEn) {
    return null;
  }

  return {
    prompt,
    label: {
      en: labelEn,
      'zh-CN': labelZhCn || labelEn,
    },
  };
}

function normalizeAnchors(payload: RawAnchorPayload): SoundscapeNarrativeAnchors | null {
  const cues = (payload.cues ?? [])
    .map((cue) => normalizeCue(cue))
    .filter((cue): cue is NarrativeAnchorCue => cue !== null)
    .slice(0, 3);

  const signature = normalizeCue(payload.signature);
  const atmosphereTone = payload.atmosphere_tone?.trim();
  const specificityInstruction = payload.specificity_instruction?.trim();
  const confidence =
    typeof payload.confidence === 'number'
      ? Math.min(Math.max(payload.confidence, 0), 1)
      : 0;

  if (confidence < MIN_CONFIDENCE || cues.length === 0) {
    return null;
  }

  return {
    source: 'llm',
    confidence,
    cues,
    signature: signature ?? undefined,
    atmosphereTone: atmosphereTone || undefined,
    specificityInstruction: specificityInstruction || undefined,
  };
}

function buildMessages(context: LocationContext): Array<{ role: 'system' | 'user'; content: string }> {
  const system = [
    'You generate grounded local sound anchors for an audio soundscape engine.',
    'Return JSON only.',
    'Never invent landmarks, festivals, or iconic sounds unless they are widely characteristic and strongly justified by the location name.',
    'If the place is obscure, stay conservative and rely on everyday street life, water, terrain, climate, and language context.',
    'Avoid generic filler such as door chimes or bicycle bells unless they are genuinely appropriate to this exact place.',
    'All prompts must be in natural English for audio generation.',
    'Labels must be short. Provide both English and Simplified Chinese labels.',
  ].join(' ');

  const user = JSON.stringify(
    {
      task:
        'Produce up to 3 concrete sound anchors plus an optional signature cue. Focus on what local residents would plausibly recognize.',
      output_format: {
        cues: [
          {
            prompt_en: 'string',
            label_en: 'string',
            label_zh_cn: 'string',
          },
        ],
        signature: {
          prompt_en: 'string',
          label_en: 'string',
          label_zh_cn: 'string',
        },
        atmosphere_tone: 'string',
        specificity_instruction: 'string',
        confidence: 'number between 0 and 1',
      },
      location: {
        cityName: context.cityName,
        regionName: context.regionName ?? '',
        countryName: context.countryName,
        coordinates: context.coordinates,
        regionType: context.regionType,
        cultureRegion: context.cultureRegion,
        primaryLanguage: context.primaryLanguage,
        languageVariant: context.languageVariant,
        secondaryLanguages: context.secondaryLanguages,
        timeSlot: context.timeSlot,
        currentLocalHour: context.currentLocalHour,
        terrain: context.terrain,
        nearWater: context.nearWater,
        climate: context.climate,
        urbanDensity: context.urbanDensity,
        economicLevel: context.economicLevel,
      },
    },
    null,
    2
  );

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export async function enrichSoundscapeNarrative(
  context: LocationContext,
  config: LlmEnhancementConfig
): Promise<SoundscapeNarrativeAnchors | null> {
  const endpoint = buildChatCompletionsUrl(config.baseUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      max_tokens: 400,
      messages: buildMessages(context),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(
      `LLM enrichment failed (${response.status}): ${responseText || response.statusText}`
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = extractContent(data);
  if (!content) {
    return null;
  }

  const parsed = parseJsonObject(content);
  if (!parsed) {
    return null;
  }

  return normalizeAnchors(parsed);
}

export const __private__ = {
  buildChatCompletionsUrl,
  parseJsonObject,
  normalizeAnchors,
};
