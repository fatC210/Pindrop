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

const NON_NARRATIVE_LINE_PATTERNS = [
  /^\s*(?:goal|format|language|length|content constraints|audible details|requirements?)\s*:/i,
  /^\s*(?:location|context)\s*:/i,
  /^\s*(?:draft\s*\d+|step\s*\d+)\b/i,
  /\banalyze the request\b/i,
  /\banalyze the location\b/i,
  /\bbrainstorming soundscape details\b/i,
  /\bdrafting the soundscape\b/i,
  /\biterative process\b/i,
  /\bknown for\b/i,
  /\bprioritize\b/i,
  /\bkeep it concise\b/i,
  /\bnever output\b/i,
  /\bdo not invent\b/i,
];

const SUMMARY_SCAFFOLDING_PATTERNS = [
  /^\s*cues?\s*:/i,
  /^\s*summary\s*:/i,
  /^\s*scene\s*\d+\s*:/i,
  /(?:^|\s)\d+\s*[\).:]\s+\S+/,
  /(?:^|\n)\s*[-*]\s+\S+/,
];

const DEBUG_TAIL_PATTERNS = [
  /"\s*(?:location|raw|choices|created|id|model|object|usage|prompt_token_ids)\s*:/i,
  /\b(?:location|raw|choices|created|id|model|object|usage|prompt_token_ids)\s*:\s*[{[]/i,
  /\[\[prototype\]\]/i,
];

const PREFERRED_NARRATIVE_SECTION_PATTERNS = [
  /\bbrainstorm audible details\b/i,
  /\bdetermine soundscape elements\b/i,
  /\baudible details\b/i,
  /\blocal character\b/i,
  /\bdrafting the soundscape\b/i,
  /听觉细节/,
  /可听细节/,
  /本地特色/,
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

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s'"`~!@#$%^&*+=|\\/:;,.?()[\]{}<>-]+/g, '');
}

function isLikelyLocationEcho(
  content: string,
  context: LocationContext | undefined
): boolean {
  if (!context) {
    return false;
  }

  const normalizedContent = normalizeComparableText(content);
  if (!normalizedContent) {
    return false;
  }

  const normalizedLocationParts = [
    context.countryName,
    context.administrativeRegionName,
    context.regionName,
    context.cityName,
  ]
    .map((part) => normalizeComparableText(part ?? ''))
    .filter((part, index, parts) => part.length >= 3 && parts.indexOf(part) === index);

  if (normalizedLocationParts.length === 0) {
    return false;
  }

  const matchedLocationParts = normalizedLocationParts.filter((part) =>
    normalizedContent.includes(part)
  );

  if (matchedLocationParts.length < Math.min(2, normalizedLocationParts.length)) {
    return false;
  }

  let residual = normalizedContent;
  for (const part of matchedLocationParts) {
    residual = residual.split(part).join('');
  }

  return residual.length <= Math.max(10, Math.floor(normalizedContent.length * 0.28));
}

function isDisplayableSummary(content: string): boolean {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return false;
  }

  return !SUMMARY_SCAFFOLDING_PATTERNS.some((pattern) => pattern.test(content));
}

function trimDebugTail(content: string): string {
  let firstMatchIndex = -1;

  for (const pattern of DEBUG_TAIL_PATTERNS) {
    const match = pattern.exec(content);
    if (!match) {
      continue;
    }

    if (firstMatchIndex === -1 || match.index < firstMatchIndex) {
      firstMatchIndex = match.index;
    }
  }

  const trimmed =
    firstMatchIndex === -1 ? content.trim() : content.slice(0, firstMatchIndex).trim();

  return trimmed.replace(/["'`]+$/, '').trim();
}

function stripLeadScaffolding(content: string): string {
  return content
    .trim()
    .replace(/^\d+\s*[\).:]\s*/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\*{1,2}\s*([^*]+?)\s*:\s*\*{1,2}\s*/, '')
    .replace(/^(?:cues?|summary|scene\s*\d+)\s*[:：]\s*/i, '')
    .replace(/^(?:final answer|answer|response)\s*[:：]\s*/i, '')
    .replace(/^(?:draft\s*\d+(?:\s*\([^)]*\))?)\s*[:：]\s*/i, '')
    .trim();
}

function matchesTargetScript(content: string, locale: AppLocale): boolean {
  return locale === 'zh-CN' ? /[\u3400-\u9fff]/.test(content) : /[A-Za-z]/.test(content);
}

function collapseInlineEnumerations(content: string): string {
  return content.replace(/(?:^|\s)\d+\s*[\).:]\s+/g, ' ').replace(/\s+/g, ' ').trim();
}

interface ExtractNarrativeSummaryOptions {
  allowMismatchedScript?: boolean;
}

function extractNarrativeSummary(
  content: string,
  locale: AppLocale,
  context?: LocationContext,
  options: ExtractNarrativeSummaryOptions = {}
): string | null {
  const cleaned = trimDebugTail(stripLeadScaffolding(content));
  if (!cleaned) {
    return null;
  }

  const normalizedCandidate = collapseInlineEnumerations(cleaned);
  if (!normalizedCandidate) {
    return null;
  }

  if (
    META_REASONING_PATTERNS.some((pattern) => pattern.test(normalizedCandidate)) ||
    NON_NARRATIVE_LINE_PATTERNS.some((pattern) => pattern.test(cleaned)) ||
    !isDisplayableSummary(normalizedCandidate) ||
    (!options.allowMismatchedScript && !matchesTargetScript(normalizedCandidate, locale))
  ) {
    return null;
  }

  const fragments = normalizedCandidate
    .split(/(?<=[.!?;。！？；])\s+/)
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.length >= 4 &&
        (options.allowMismatchedScript || matchesTargetScript(part, locale))
    );

  const completeFragments = fragments.filter((part) => /[.!?。！？]$/.test(part));
  const selectedFragments = completeFragments.length > 0 ? completeFragments : fragments;
  const normalizedSummary = selectedFragments
    .join(locale === 'zh-CN' ? '' : ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedSummary || isLikelyLocationEcho(normalizedSummary, context)) {
    return null;
  }

  return normalizedSummary || null;
}

function getMarkedSegments(content: string): string[] {
  const markers = [
    /(?:final answer|answer|response)\s*[:：]\s*([\s\S]+)/i,
    /draft\s*\d+(?:\s*\([^)]*\))?\s*:\*?\s*([\s\S]+)/i,
  ];

  return markers
    .map((pattern) => content.match(pattern)?.[1]?.trim() ?? '')
    .filter((part, index, allParts) => part.length > 0 && allParts.indexOf(part) === index);
}

function isStructuredSectionHeader(line: string): boolean {
  const normalizedLine = line.trim();
  if (!normalizedLine) {
    return false;
  }

  return /^\d+\s*[\).:]/.test(normalizedLine) || /^#{1,6}\s+/.test(normalizedLine);
}

function extractPreferredSectionCandidates(
  content: string,
  locale: AppLocale,
  context?: LocationContext
): string[] {
  const lines = content.split('\n');
  const candidates: Array<{
    strict: string | null;
    fallback: string | null;
  }> = [];
  let inPreferredSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (isStructuredSectionHeader(line)) {
      inPreferredSection = PREFERRED_NARRATIVE_SECTION_PATTERNS.some((pattern) =>
        pattern.test(line)
      );
      continue;
    }

    if (!inPreferredSection) {
      continue;
    }

    const strict = extractNarrativeSummary(line, locale, context);
    const fallback =
      strict ??
      extractNarrativeSummary(line, locale, context, {
        allowMismatchedScript: true,
      });

    if (strict || fallback) {
      candidates.push({ strict, fallback });
    }
  }

  const hasStrictCandidate = candidates.some((candidate) => candidate.strict);
  return dedupeComparableText(
    candidates
      .map((candidate) => (hasStrictCandidate ? candidate.strict ?? candidate.fallback : candidate.fallback))
      .filter((candidate): candidate is string => Boolean(candidate))
  );
}

function dedupeComparableText(values: string[]): string[] {
  return values.filter(
    (value, index, allValues) =>
      allValues.findIndex(
        (existing) => normalizeComparableText(existing) === normalizeComparableText(value)
      ) === index
  );
}

function joinNarrativeCandidates(candidates: string[], locale: AppLocale): string {
  const joiner =
    locale === 'zh-CN' && !candidates.some((candidate) => /[A-Za-z]/.test(candidate)) ? '' : ' ';

  return candidates.join(joiner);
}

function extractFreeformNarrativeBody(
  content: string,
  locale: AppLocale,
  context?: LocationContext
): string | null {
  const preferredSectionCandidates = extractPreferredSectionCandidates(content, locale, context);
  if (preferredSectionCandidates.length > 0) {
    return joinNarrativeCandidates(preferredSectionCandidates, locale);
  }

  const structuredCandidates = dedupeComparableText([
    ...getMarkedSegments(content)
      .map((candidate) => extractNarrativeSummary(candidate, locale, context))
      .filter((candidate): candidate is string => Boolean(candidate)),
    ...content
      .split('\n')
      .map((line) => extractNarrativeSummary(line, locale, context))
      .filter((candidate): candidate is string => Boolean(candidate)),
  ]);

  if (structuredCandidates.length > 0) {
    return joinNarrativeCandidates(structuredCandidates, locale);
  }

  return extractNarrativeSummary(content, locale, context);
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
  summaryZhCn: string,
  context?: LocationContext
): LocalizedCueLabel | undefined {
  const normalizedSummaryEn = extractNarrativeSummary(summaryEn, 'en', context) ?? '';
  const normalizedSummaryZhCn = extractNarrativeSummary(summaryZhCn, 'zh-CN', context) ?? '';

  if (!normalizedSummaryEn && !normalizedSummaryZhCn) {
    return undefined;
  }

  return {
    en: normalizedSummaryEn || normalizedSummaryZhCn,
    'zh-CN': normalizedSummaryZhCn || normalizedSummaryEn,
  };
}

function normalizeAnchors(
  payload: RawAnchorPayload,
  context?: LocationContext
): SoundscapeNarrativeAnchors | null {
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
    summary: normalizeSummary(summaryEn, summaryZhCn, context),
    cues,
    signature: signature ?? undefined,
    atmosphereTone: atmosphereTone || undefined,
    specificityInstruction: specificityInstruction || undefined,
  };
}

function normalizeFreeformAnchors(
  content: string,
  locale: AppLocale,
  context?: LocationContext
): SoundscapeNarrativeAnchors | null {
  const trimmedContent = stripCodeFence(stripThinkingSections(content)).trim();
  if (!trimmedContent) {
    return null;
  }

  if (parseJsonObject(trimmedContent)) {
    return null;
  }

  const resolvedSummary = extractFreeformNarrativeBody(trimmedContent, locale, context);
  if (!resolvedSummary) {
    return null;
  }

  const fragments = resolvedSummary
    .split(/[.!?;。！？；]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .slice(0, 3);

  const prompts = fragments.length > 0 ? fragments : [resolvedSummary];
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
    summary: createLocalizedText(resolvedSummary, locale),
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
    'Generate one short place-specific soundscape description for direct display in a task card.',
    'Return only the final body text with no JSON, no markdown, no code fences, no labels, and no extra explanation.',
    `Write in ${getTargetLanguageLabel(locale)}.`,
    'Write one short natural-language paragraph, not a single long paragraph.',
    'Keep it brief enough for a compact UI card.',
    locale === 'zh-CN'
      ? 'Target roughly 24 to 50 Chinese characters when possible.'
      : 'Target roughly 12 to 30 words when possible.',
    'One or two sentences is enough.',
    'Use concrete audible details so a listener can compare the paragraph with the generated audio.',
    'Do not invent landmarks, festivals, narration, announcer intros, dialogue scripts, bullets, drafts, or numbered headings.',
    'Do not reply with the place name, its translation, coordinates, or an administrative hierarchy by itself.',
  ].join(' ');

  const user = [
    'Requirements:',
    '- Output only the final short display paragraph, with no thinking process or analysis.',
    '- Describe concrete audible details with local character.',
    '- Prioritize markets, rivers, parks, shops, water, vehicles, and everyday routines when relevant.',
    '- Keep it natural, specific, complete, and short.',
    '- Never output strings like "conversation 1", "Cues:", "Summary:", numbered scene headings, or spoken-intro scripts.',
    '- Avoid long lists joined by commas.',
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
    return normalizeFreeformAnchors(content, locale, context);
  }

  return normalizeAnchors(parsed, context) ?? normalizeFreeformAnchors(content, locale, context);
}

export const __private__ = {
  buildChatCompletionsUrl: buildLlmChatCompletionsUrl,
  buildMessages,
  normalizeFreeformAnchors,
  parseJsonObject,
  normalizeAnchors,
  isDisplayableSummary,
};
