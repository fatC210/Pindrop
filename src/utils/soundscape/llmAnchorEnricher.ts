import type { LlmEnhancementConfig } from '@/components/settings/preferencesStore';
import type { AppLocale } from '@/i18n/types';
import { buildLlmChatCompletionsUrl } from '@/components/settings/llmConfigUtils';
import type { LocationContext } from '@/types/locationContext';
import type {
  LocalizedCueLabel,
  NarrativeAnchorCue,
  SoundscapeNarrativeAnchors,
} from '@/types/soundscapeRecipe';

const DEFAULT_CONFIDENCE = 0.72;

interface RawCuePayload {
  prompt?: string;
  prompt_en?: string;
  prompt_zh_cn?: string;
  label?: string;
  label_en?: string;
  label_zh_cn?: string;
}

interface RawAnchorPayload {
  summary?: string;
  summary_en?: string;
  summary_zh_cn?: string;
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

const REASONING_CONTENT_TYPES = new Set([
  'analysis',
  'reasoning',
  'reasoning_content',
  'thinking',
  'thought',
]);

const META_REASONING_PATTERNS = [
  /\bthe user wants\b/i,
  /\blet me think\b/i,
  /\bi need to\b/i,
  /\breturn a json object\b/i,
  /\brequirements:\b/i,
  /\blocation:\b/i,
  /\bcontext:\b/i,
  /\bwhat would be characteristic sounds\b/i,
];

const SUMMARY_SCAFFOLDING_PATTERNS = [
  /^\s*cues?\s*:/i,
  /^\s*summary\s*:/i,
  /^\s*scene\s*\d+\s*:/i,
  /(?:^|\s)\d+\s*[\).:]\s+\S+/,
  /(?:^|\n)\s*[-*•]\s+\S+/,
];

function stripThinkingSections(content: string): string {
  return content
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<reasoning\b[^>]*>[\s\S]*?<\/reasoning>/gi, ' ')
    .trim();
}

function extractTextContent(
  content: string | Array<{ type?: string; text?: string }> | undefined
): string {
  if (typeof content === 'string') {
    return stripThinkingSections(content);
  }

  if (Array.isArray(content)) {
    const preferredParts = content.filter((part) => {
      const normalizedType = part.type?.trim().toLowerCase();
      return !normalizedType || !REASONING_CONTENT_TYPES.has(normalizedType);
    });
    const selectedParts = preferredParts.length > 0 ? preferredParts : content;

    return stripThinkingSections(
      selectedParts
        .map((part) => part.text?.trim() ?? '')
        .filter((part) => part.length > 0)
        .join('\n')
    );
  }

  return '';
}

function extractContent(response: ChatCompletionResponse): string {
  return extractTextContent(response.choices?.[0]?.message?.content);
}

function stripCodeFence(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return content;
}

function parseJsonObject(content: string): RawAnchorPayload | null {
  const stripped = stripCodeFence(stripThinkingSections(content));

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

function buildLocationPrompt(context: LocationContext): string {
  return [
    context.countryName,
    context.administrativeRegionName,
    context.regionName,
    context.cityName,
  ]
    .map((part) => part?.trim())
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(', ');
}

function buildContextPrompt(context: LocationContext): string {
  const details = [
    `time: ${context.timeSlot}`,
    `terrain: ${context.terrain}`,
    context.nearWater ? `near water: ${context.nearWater}` : null,
    `climate: ${context.climate}`,
    `region type: ${context.regionType}`,
    `language: ${context.languageVariant}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join('; ');

  return details ? `\nContext: ${details}` : '';
}

function createCueLabel(prompt: string): string {
  const normalizedPrompt = prompt.replace(/\s+/g, ' ').trim();
  if (!normalizedPrompt) {
    return '';
  }

  const cjkChars = Array.from(normalizedPrompt).filter((char) => /[\u3400-\u9fff]/.test(char));
  if (cjkChars.length > 0) {
    return cjkChars.slice(0, 18).join('');
  }

  return normalizedPrompt.split(/\s+/).slice(0, 6).join(' ');
}

function createLocalizedText(value: string, locale: AppLocale): LocalizedCueLabel {
  return locale === 'zh-CN'
    ? {
        en: '',
        'zh-CN': value,
      }
    : {
        en: value,
        'zh-CN': '',
      };
}

function isDisplayableSummary(content: string): boolean {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return false;
  }

  return !SUMMARY_SCAFFOLDING_PATTERNS.some((pattern) => pattern.test(content));
}

function normalizeCue(payload: RawCuePayload | undefined): NarrativeAnchorCue | null {
  if (!payload) {
    return null;
  }

  const prompt =
    payload.prompt_en?.trim() ??
    payload.prompt?.trim() ??
    payload.prompt_zh_cn?.trim() ??
    '';
  const labelEn = payload.label_en?.trim() ?? payload.label?.trim() ?? '';
  const labelZhCn =
    payload.label_zh_cn?.trim() ??
    payload.label?.trim() ??
    payload.label_en?.trim() ??
    '';

  if (!prompt) {
    return null;
  }

  const fallbackLabel =
    prompt.replace(/\s+/g, ' ').trim().slice(0, 48).trim() || createCueLabel(prompt);
  const resolvedLabelEn = labelEn || fallbackLabel;

  if (!resolvedLabelEn) {
    return null;
  }

  return {
    prompt,
    label: {
      en: resolvedLabelEn,
      'zh-CN': labelZhCn || resolvedLabelEn,
    },
  };
}

function normalizeSummary(
  summaryEn: string,
  summaryZhCn: string
): LocalizedCueLabel | undefined {
  if (!summaryEn && !summaryZhCn) {
    return undefined;
  }

  return {
    en: summaryEn || summaryZhCn,
    'zh-CN': summaryZhCn || summaryEn,
  };
}

function normalizeAnchors(payload: RawAnchorPayload): SoundscapeNarrativeAnchors | null {
  const summaryEn = payload.summary_en?.trim() ?? payload.summary?.trim() ?? '';
  const summaryZhCn =
    payload.summary_zh_cn?.trim() ??
    payload.summary?.trim() ??
    payload.summary_en?.trim() ??
    '';
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
      : DEFAULT_CONFIDENCE;

  if (cues.length === 0) {
    return null;
  }

  return {
    source: 'llm',
    confidence,
    summary: normalizeSummary(summaryEn, summaryZhCn),
    cues,
    signature: signature ?? undefined,
    atmosphereTone: atmosphereTone || undefined,
    specificityInstruction: specificityInstruction || undefined,
  };
}

function normalizeFreeformAnchors(
  content: string,
  locale: AppLocale
): SoundscapeNarrativeAnchors | null {
  const trimmedContent = stripThinkingSections(content).trim();
  if (!trimmedContent) {
    return null;
  }

  const paragraphCandidates = trimmedContent
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const selectedContent =
    [...paragraphCandidates]
      .reverse()
      .find(
        (part) => !META_REASONING_PATTERNS.some((pattern) => pattern.test(part))
      ) ?? trimmedContent;
  const withoutAnswerPrefix = selectedContent.replace(
    /^(?:final answer|answer|response)\s*[:：-]\s*/i,
    ''
  );
  const normalizedContent = withoutAnswerPrefix.replace(/\s+/g, ' ').trim();
  if (!normalizedContent) {
    return null;
  }

  if (
    META_REASONING_PATTERNS.some((pattern) => pattern.test(normalizedContent)) ||
    !isDisplayableSummary(selectedContent)
  ) {
    return null;
  }

  const fragments = normalizedContent
    .split(/[.!?;。！？；]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .slice(0, 3);

  const prompts = fragments.length > 0 ? fragments : [normalizedContent];
  const cues = prompts
    .map((prompt) => {
      const label = createCueLabel(prompt);
      if (!label) {
        return null;
      }

      return {
        prompt,
        label: createLocalizedText(label, locale),
      };
    })
    .filter((cue): cue is NarrativeAnchorCue => cue !== null);

  if (cues.length === 0) {
    return null;
  }

  return {
    source: 'llm',
    confidence: DEFAULT_CONFIDENCE,
    summary: createLocalizedText(normalizedContent, locale),
    cues,
    signature: cues[0],
  };
}

function getTargetLanguageLabel(locale: AppLocale): string {
  return locale === 'zh-CN' ? 'Simplified Chinese' : 'English';
}

function buildMessages(
  context: LocationContext,
  locale: AppLocale
): Array<{ role: 'system' | 'user'; content: string }> {
  const system = [
    'Generate one short place-specific soundscape description.',
    'Return only the description text with no JSON, no markdown, no code fences, and no extra explanation.',
    `Write in ${getTargetLanguageLabel(locale)}.`,
    'Use 1 to 3 complete sentences that can be shown directly in a task card.',
    'Do not invent landmarks, festivals, narration, announcer intros, dialogue scripts, bullets, or numbered headings.',
  ].join(' ');

  const user = [
    'Requirements:',
    '- Describe concrete audible details with local character.',
    '- Prioritize markets, rivers, parks, shops, water, and everyday routines when relevant.',
    '- Keep it concise, natural, and complete.',
    '- Never output strings like "conversation 1", "Cues:", numbered scene headings, or spoken-intro scripts.',
    '',
    `Location: ${buildLocationPrompt(context)}${buildContextPrompt(context)}`,
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export async function enrichSoundscapeNarrative(
  context: LocationContext,
  config: LlmEnhancementConfig,
  locale: AppLocale
): Promise<SoundscapeNarrativeAnchors | null> {
  const endpoint = buildLlmChatCompletionsUrl(config.baseUrl);
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
      messages: buildMessages(context, locale),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    console.error('[PinDrop Debug] Raw LLM HTTP error response:', {
      location: {
        cityName: context.cityName,
        regionName: context.regionName ?? null,
        countryName: context.countryName,
      },
      status: response.status,
      responseText: responseText || response.statusText,
    });
    throw new Error(
      `LLM enrichment failed (${response.status}): ${responseText || response.statusText}`
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = extractContent(data);
  console.info('[PinDrop Debug] Raw LLM narrative response:', {
    location: {
      cityName: context.cityName,
      regionName: context.regionName ?? null,
      countryName: context.countryName,
    },
    content,
    raw: data,
  });
  if (!content) {
    return null;
  }

  const parsed = parseJsonObject(content);
  if (!parsed) {
    return normalizeFreeformAnchors(content, locale);
  }

  return normalizeAnchors(parsed) ?? normalizeFreeformAnchors(content, locale);
}

export const __private__ = {
  buildChatCompletionsUrl: buildLlmChatCompletionsUrl,
  buildMessages,
  normalizeFreeformAnchors,
  parseJsonObject,
  normalizeAnchors,
  isDisplayableSummary,
};
