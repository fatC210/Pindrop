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

const PROMPT_TAIL_PATTERNS = [
  /\bgenerate (?:one|a) short place-specific soundscape description\b/i,
  /\bgenerate one place-specific soundscape description paragraph\b/i,
  /\breturn only the final body text\b/i,
  /\breturn only the description text\b/i,
  /\bone short natural-language paragraph\b/i,
  /\bno json,\s*no markdown\b/i,
  /\bno json\b/i,
  /\bno markdown\b/i,
  /\b\d+\s*-\s*\d+\s*words\b/i,
  /\bzh-cn\b/i,
];

const AUDIBLE_FRAGMENT_PATTERNS = [
  /\b(?:wind|voice|voices|footsteps|steps|bell|market|vendor|vendors|shop|shops|store|storefront|shutter|river|stream|water|wave|waves|motorcycle|scooter|bicycle|bike|truck|bus|car|traffic|engine|horn|boat|oar|bird|birds|dog|dogs|yak|yaks|cow|cows|goat|goats|livestock|rumble|murmur|murmurs|clack|clatter|hum|hums|hiss|sizzle|splash|drip|gate|door|radio|music|accordion|mahjong|tile|tiles|tea|cups|bowl|bowls|chopsticks|greeting|greetings|call|calls|calling|street|stalls?)\b/i,
  /(?:风|人声|脚步|脚步声|水声|流水|河水|溪水|河边|溪边|车声|车流|摩托|电动车|自行车|喇叭|引擎|钟声|铃声|卷闸门|门响|摊位|集市|市场|叫卖|吆喝|鸟叫|狗叫|牦牛|牛羊|麻将|茶杯|碗筷|广播|音乐|浪声)/,
];

const NON_AUDIBLE_FRAGMENT_PATTERNS = [
  /\b(?:the user wants|let me think|requirements?|format|language|location|context)\b/i,
  /\b(?:small\s+town(?:ship)?|located in|administrative|autonomous region|province|county)\b/i,
  /^\s*(?:dawn|day|dusk|night|plain|temperate|tropical|polar|town|village|city|zh-cn)(?:[\s,;.]|$)/i,
];

const DISCOURAGED_SPEECH_PATTERNS = [
  /\b(?:monologue|narration|narrator|voice-?over|announcer|broadcast|newscast|podcast|readout|recit(?:e|ed|al)|quoted speech|spoken intro|spoken line|clear dialogue|intelligible speech|text[- ]to[- ]speech|tts)\b/i,
  /\b(?:english|french|german|spanish|japanese|korean)\s+(?:words?|speech|line|dialogue|voice|tts)\b/i,
  /\b(?:in english|in french|in german|in spanish|in japanese|in korean)\b/i,
  /\b(?:says?|saying|said|shouts?|yells?|announces?|reads?|reading|counts?)\b/i,
];

function normalizeCuePrompt(prompt: string): string {
  return prompt
    .replace(/\bconversation\b/gi, 'human murmur')
    .replace(/\bconversations\b/gi, 'human murmur')
    .replace(/\bvoices\b/gi, 'human presence')
    .replace(/\bvoice\b/gi, 'human presence')
    .replace(/\btalk\b/gi, 'murmur')
    .replace(/\bgreetings?\b/gi, 'indistinct local calls')
    .replace(/\bcommenting\b/gi, 'reacting softly')
    .replace(/\bquoted speech\b/gi, 'human texture')
    .replace(/\bclear dialogue\b/gi, 'human texture')
    .replace(/\bintelligible speech\b/gi, 'human texture')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDisallowedSpeechCue(prompt: string, context?: LocationContext): boolean {
  if (!prompt.trim()) {
    return true;
  }

  if (DISCOURAGED_SPEECH_PATTERNS.some((pattern) => pattern.test(prompt))) {
    return true;
  }

  const languageVariant = context?.languageVariant?.toLowerCase() ?? '';
  const isChineseContext =
    languageVariant.startsWith('zh') ||
    normalizeComparableText(context?.countryName ?? '').includes('china');

  if (
    isChineseContext &&
    /\b(?:english|american|british)\b/i.test(prompt) &&
    /\b(?:speech|voice|dialogue|words?|line|tts)\b/i.test(prompt)
  ) {
    return true;
  }

  return false;
}

const DISPLAY_FRAGMENT_LIMIT = 3;
const DISPLAY_MAX_EN_WORDS = 48;
const DISPLAY_MAX_ZH_CHARS = 84;

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

function trimPromptTail(content: string): string {
  let firstMatchIndex = -1;

  for (const pattern of PROMPT_TAIL_PATTERNS) {
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

function splitNarrativeFragments(content: string): string[] {
  return content
    .split(/(?<=[.!?;銆傦紒锛燂紱])(?:\s+|$)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function isLikelyAudibleFragment(
  fragment: string,
  locale: AppLocale,
  context?: LocationContext
): boolean {
  if (!fragment || isLikelyLocationEcho(fragment, context)) {
    return false;
  }

  if (META_REASONING_PATTERNS.some((pattern) => pattern.test(fragment))) {
    return false;
  }

  if (AUDIBLE_FRAGMENT_PATTERNS.some((pattern) => pattern.test(fragment))) {
    return true;
  }

  if (NON_AUDIBLE_FRAGMENT_PATTERNS.some((pattern) => pattern.test(fragment))) {
    return false;
  }

  return matchesTargetScript(fragment, locale);
}

function takeDisplayFragments(fragments: string[], locale: AppLocale): string[] {
  const selected: string[] = [];
  let wordCount = 0;
  let cjkCount = 0;

  for (const fragment of fragments) {
    if (selected.length >= DISPLAY_FRAGMENT_LIMIT) {
      break;
    }

    const nextWordCount = wordCount + fragment.split(/\s+/).filter(Boolean).length;
    const nextCjkCount =
      cjkCount + Array.from(fragment).filter((char) => /[\u3400-\u9fff]/.test(char)).length;

    if (
      selected.length > 0 &&
      ((locale === 'zh-CN' && nextCjkCount > DISPLAY_MAX_ZH_CHARS) ||
        (locale !== 'zh-CN' && nextWordCount > DISPLAY_MAX_EN_WORDS))
    ) {
      break;
    }

    selected.push(fragment);
    wordCount = nextWordCount;
    cjkCount = nextCjkCount;
  }

  return selected;
}

function condenseNarrativeForDisplay(
  content: string,
  locale: AppLocale,
  context?: LocationContext
): string | null {
  const normalizedCandidate = collapseInlineEnumerations(
    trimPromptTail(trimDebugTail(stripLeadScaffolding(content)))
  );
  if (!normalizedCandidate) {
    return null;
  }

  const fragments = splitNarrativeFragments(normalizedCandidate).filter(
    (fragment) =>
      fragment.length >= 4 &&
      !NON_NARRATIVE_LINE_PATTERNS.some((pattern) => pattern.test(fragment))
  );
  if (fragments.length === 0) {
    return null;
  }

  const audibleFragments = fragments.filter((fragment) =>
    isLikelyAudibleFragment(fragment, locale, context)
  );
  const selectedFragments = takeDisplayFragments(
    audibleFragments.length > 0 ? audibleFragments : fragments,
    locale
  );
  const summary = joinNarrativeCandidates(selectedFragments, locale).trim();

  if (!summary || !isDisplayableSummary(summary) || isLikelyLocationEcho(summary, context)) {
    return null;
  }

  return summary;
}

function trimNarrativeDisplayLength(content: string, locale: AppLocale): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return normalized;
  }

  if (locale === 'zh-CN') {
    const cjkChars = Array.from(normalized).filter((char) => /[\u3400-\u9fff]/.test(char)).length;
    if (cjkChars <= DISPLAY_MAX_ZH_CHARS) {
      return normalized;
    }
  } else {
    const words = normalized.split(/\s+/).filter(Boolean).length;
    if (words <= DISPLAY_MAX_EN_WORDS) {
      return normalized;
    }
  }

  const fragments = splitNarrativeFragments(normalized);
  const selectedFragments = takeDisplayFragments(fragments, locale);
  return joinNarrativeCandidates(selectedFragments, locale).trim() || normalized;
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
  const cleaned = trimPromptTail(trimDebugTail(stripLeadScaffolding(content)));
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

interface MarkedSegmentCandidate {
  body: string;
  kind: 'draft' | 'final';
}

function getOrderedMarkedSegments(content: string): MarkedSegmentCandidate[] {
  const normalizedContent = content.replace(/\r\n?/g, '\n');
  const markerPattern =
    /(?:^|[\s\n])(?:\*{1,2}\s*)?(final answer|answer|response|draft\s*\d+(?:\s*\([^)]*\))?)\s*[:：]\s*/gi;
  const markers: Array<{ end: number; index: number; kind: 'draft' | 'final' }> = [];
  let match: RegExpExecArray | null = null;

  while ((match = markerPattern.exec(normalizedContent)) !== null) {
    const label = match[1]?.trim().toLowerCase() ?? '';
    markers.push({
      index: match.index,
      end: markerPattern.lastIndex,
      kind: label.startsWith('draft') ? 'draft' : 'final',
    });
  }

  return markers
    .map((marker, index) => {
      const nextIndex = markers[index + 1]?.index ?? normalizedContent.length;
      const body = normalizedContent.slice(marker.end, nextIndex).trim();
      return body
        ? {
            body,
            kind: marker.kind,
          }
        : null;
    })
    .filter((segment): segment is MarkedSegmentCandidate => segment !== null);
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
  const markedSegments = getOrderedMarkedSegments(content);
  const finalSegmentCandidates = markedSegments
    .filter((segment) => segment.kind === 'final')
    .map((segment) => extractNarrativeSummary(segment.body, locale, context))
    .filter((candidate): candidate is string => Boolean(candidate));
  if (finalSegmentCandidates.length > 0) {
    return finalSegmentCandidates.at(-1) ?? null;
  }

  const draftSegmentCandidates = markedSegments
    .filter((segment) => segment.kind === 'draft')
    .map((segment) => extractNarrativeSummary(segment.body, locale, context))
    .filter((candidate): candidate is string => Boolean(candidate));
  if (draftSegmentCandidates.length > 0) {
    return draftSegmentCandidates.at(-1) ?? null;
  }

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

  const normalizedPrompt = normalizeCuePrompt(prompt);

  if (!normalizedPrompt) {
    return null;
  }

  const fallbackLabel =
    normalizedPrompt.replace(/\s+/g, ' ').trim().slice(0, 48).trim() ||
    createCueLabel(normalizedPrompt);
  const resolvedLabelEn = labelEn || fallbackLabel;

  if (!resolvedLabelEn) {
    return null;
  }

  return {
    prompt: normalizedPrompt,
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
    .filter((cue) => !isDisallowedSpeechCue(cue.prompt, context))
    .slice(0, 3);

  const signatureCandidate = normalizeCue(payload.signature);
  const signature =
    signatureCandidate && !isDisallowedSpeechCue(signatureCandidate.prompt, context)
      ? signatureCandidate
      : null;
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
    specificityInstruction:
      specificityInstruction && !isDisallowedSpeechCue(specificityInstruction, context)
        ? specificityInstruction
        : undefined,
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

  const resolvedNarrativeBody = extractFreeformNarrativeBody(trimmedContent, locale, context);
  if (!resolvedNarrativeBody) {
    return null;
  }

  const fragments = resolvedNarrativeBody
    .split(/[.!?;。！？；]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .slice(0, 3);

  const prompts = fragments.length > 0 ? fragments : [resolvedNarrativeBody];
  const cues = prompts
    .map((prompt) => normalizeCuePrompt(prompt))
    .filter((prompt) => !isDisallowedSpeechCue(prompt, context))
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
    summary: createLocalizedText(resolvedNarrativeBody, locale),
    cues,
    signature: cues[0],
  };
}

export function sanitizeNarrativeDisplayText(
  content: string,
  locale: AppLocale,
  context?: LocationContext
): string | null {
  const trimmedContent = stripCodeFence(stripThinkingSections(content)).trim();
  if (!trimmedContent) {
    return null;
  }

  const extracted =
    extractFreeformNarrativeBody(trimmedContent, locale, context) ??
    extractNarrativeSummary(trimmedContent, locale, context, {
      allowMismatchedScript: true,
    });

  if (!extracted) {
    return null;
  }

  const normalizedExtracted = extracted.replace(/\s+/g, ' ').trim();
  if (
    normalizedExtracted &&
    isDisplayableSummary(normalizedExtracted) &&
    !isLikelyLocationEcho(normalizedExtracted, context)
  ) {
    return trimNarrativeDisplayLength(normalizedExtracted, locale);
  }

  return condenseNarrativeForDisplay(extracted, locale, context);
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
    'Do not describe a narrator, monologue, spoken intro, voice-over, announcer, quoted speech, readout, recited line, or any clearly intelligible foreground speech.',
    'Environmental human sound is allowed only as indistinct local background texture such as vendor calls, crowd wash, or passersby murmur, never as a clear solo voice or obvious TTS phrase.',
    'Do not reply with the place name, its translation, coordinates, or an administrative hierarchy by itself.',
  ].join(' ');

  const user = [
    'Requirements:',
    '- Output only the final short display paragraph, with no thinking process or analysis.',
    '- Describe concrete audible details with local character.',
    '- Prioritize markets, rivers, parks, shops, water, vehicles, and everyday routines when relevant.',
    '- Keep it natural, specific, complete, and short.',
    '- Never output strings like "conversation 1", "Cues:", "Summary:", numbered scene headings, or spoken-intro scripts.',
    '- Avoid first-person or third-person narration about someone speaking; focus on environmental sound, movement, texture, and non-verbal ambience.',
    '- If people are present, describe them as indistinct background human texture rather than intelligible speech, monologue, or quoted words.',
    '- Avoid language-specific spoken text, especially out-of-place English TTS for non-English locations such as places in China.',
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
  condenseNarrativeForDisplay,
  normalizeFreeformAnchors,
  parseJsonObject,
  normalizeAnchors,
  sanitizeNarrativeDisplayText,
  isDisplayableSummary,
};
