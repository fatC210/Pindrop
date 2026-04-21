import type {
  AmbientLayer,
  AtmosphereLayer,
  DialogueLayer,
  SignatureLayer,
  SoundscapeRecipe,
} from '@/types/soundscapeRecipe';
import type { AudioBlobMap, LayerType } from '@/utils/audio/types';
import { getApiKeyHeader } from './apiHeaders';

const ELEVENLABS_PROXY_BASE_URL = '/api/elevenlabs';
export const DEFAULT_RENDER_DURATION_SECONDS = 22;
export const MAX_SOUND_EFFECT_PROMPT_LENGTH = 450;
const PREVIEW_DURATION_SECONDS = 4;
const ELEVENLABS_PROXY_API_KEY_HEADER = 'x-elevenlabs-api-key';

interface ElevenLabsVoice {
  voice_id?: string;
  labels?: Record<string, string>;
  verified_languages?: Array<{ language?: string; model_id?: string }>;
}

export interface GeneratedLayerAudio {
  blobs: AudioBlobMap;
  failedLayers: LayerType[];
}

let voicesPromise: Promise<ElevenLabsVoice[]> | null = null;

function createAuthorizedHeaders(contentType?: string): Headers {
  const apiKeyHeader = getApiKeyHeader();
  if (!('xi-api-key' in apiKeyHeader)) {
    throw new Error('ElevenLabs API key not configured');
  }

  const headers = new Headers();
  headers.set(ELEVENLABS_PROXY_API_KEY_HEADER, apiKeyHeader['xi-api-key']);
  if (contentType) {
    headers.set('content-type', contentType);
  }

  return headers;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.clone().json()) as
        | {
            detail?: string | { message?: string };
            error?: string;
            message?: string;
          }
        | null;

      const detail =
        typeof payload?.detail === 'string'
          ? payload.detail
          : payload?.detail?.message;

      if (typeof detail === 'string' && detail.trim().length > 0) {
        return detail.trim();
      }

      if (typeof payload?.error === 'string' && payload.error.trim().length > 0) {
        return payload.error.trim();
      }

      if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
        return payload.message.trim();
      }
    } catch {
      // Fall through to text/status handling below.
    }
  }

  const responseText = await response.text().catch(() => '');
  if (responseText.trim().length > 0) {
    return responseText.trim();
  }

  switch (response.status) {
    case 401:
      return 'ElevenLabs API key invalid or expired.';
    case 404:
      return 'The requested ElevenLabs endpoint is unavailable.';
    case 422:
      return 'ElevenLabs rejected the request payload.';
    default:
      return response.statusText || 'ElevenLabs request failed';
  }
}

async function fetchProxy(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`${ELEVENLABS_PROXY_BASE_URL}/${path}`, {
    ...init,
    headers: init.headers ?? createAuthorizedHeaders(),
  });

  if (!response.ok) {
    const responseText = await extractErrorMessage(response);
    throw new Error(
      `ElevenLabs request failed (${response.status}): ${responseText}`
    );
  }

  return response;
}

async function fetchBinaryWithFallback(
  paths: string[],
  init: RequestInit
): Promise<Blob> {
  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      const response = await fetchProxy(path, init);
      return await response.blob();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('ElevenLabs request failed');
}

async function loadVoices(): Promise<ElevenLabsVoice[]> {
  if (!voicesPromise) {
    voicesPromise = fetchProxy('voices', {
      method: 'GET',
      headers: createAuthorizedHeaders(),
    })
      .then(async (response) => {
        const data = (await response.json()) as { voices?: ElevenLabsVoice[] };
        return data.voices ?? [];
      })
      .catch((error) => {
        voicesPromise = null;
        throw error;
      });
  }

  return voicesPromise;
}

function matchesLanguage(
  voice: ElevenLabsVoice,
  language: string
): boolean {
  const shortLanguage = language.split('-')[0]?.toLowerCase();
  const labelValues = Object.values(voice.labels ?? {}).map((value) =>
    value.toLowerCase()
  );

  if (labelValues.some((value) => value.includes(shortLanguage))) {
    return true;
  }

  return (voice.verified_languages ?? []).some((entry) =>
    entry.language?.toLowerCase().startsWith(shortLanguage)
  );
}

async function resolveVoiceId(
  requestedVoiceId: string,
  language: string
): Promise<string> {
  const voices = await loadVoices();
  if (voices.length === 0) {
    throw new Error('No ElevenLabs voices available for this API key');
  }

  const requested = voices.find((voice) => voice.voice_id === requestedVoiceId);
  if (requested?.voice_id) {
    return requested.voice_id;
  }

  const matchedLanguageVoice = voices.find(
    (voice) => voice.voice_id && matchesLanguage(voice, language)
  );
  if (matchedLanguageVoice?.voice_id) {
    return matchedLanguageVoice.voice_id;
  }

  const firstVoice = voices.find((voice) => typeof voice.voice_id === 'string');
  if (!firstVoice?.voice_id) {
    throw new Error('No valid ElevenLabs voice ids returned by the API');
  }

  return firstVoice.voice_id;
}

function normalizeSoundEffectPrompt(prompt: string): string {
  const normalizedPrompt = prompt.replace(/\s+/g, ' ').trim();

  if (normalizedPrompt.length <= MAX_SOUND_EFFECT_PROMPT_LENGTH) {
    return normalizedPrompt;
  }

  const sentenceFragments = normalizedPrompt.split(/(?<=[.!?])\s+/);
  let condensedPrompt = '';

  for (const fragment of sentenceFragments) {
    const nextPrompt = condensedPrompt ? `${condensedPrompt} ${fragment}` : fragment;
    if (nextPrompt.length > MAX_SOUND_EFFECT_PROMPT_LENGTH) {
      break;
    }

    condensedPrompt = nextPrompt;
  }

  if (condensedPrompt.length >= Math.min(160, MAX_SOUND_EFFECT_PROMPT_LENGTH)) {
    return condensedPrompt;
  }

  const truncatedPrompt = normalizedPrompt.slice(0, MAX_SOUND_EFFECT_PROMPT_LENGTH);
  const lastWordBoundary = truncatedPrompt.lastIndexOf(' ');

  if (lastWordBoundary >= 120) {
    return truncatedPrompt.slice(0, lastWordBoundary).trimEnd();
  }

  return truncatedPrompt.trimEnd();
}

async function generateDialogueBlob(layer: DialogueLayer): Promise<Blob> {
  const voiceId = await resolveVoiceId(layer.voiceId, layer.language);
  const payload = {
    text: layer.text.trim() || ' ',
    model_id:
      layer.model === 'eleven_v3' ? 'eleven_multilingual_v2' : layer.model,
    language_code: layer.language,
  };

  return fetchBinaryWithFallback(
    [`text-to-speech/${voiceId}`, `text-to-speech/${voiceId}/stream`],
    {
      method: 'POST',
      headers: createAuthorizedHeaders('application/json'),
      body: JSON.stringify(payload),
    }
  );
}

async function generateSoundEffectBlob(
  layer: AmbientLayer | SignatureLayer,
  durationSeconds: number
): Promise<Blob> {
  const payload = {
    text: normalizeSoundEffectPrompt(layer.prompt),
    duration_seconds: durationSeconds,
    prompt_influence: 0.35,
  };

  return fetchBinaryWithFallback(['sound-generation'], {
    method: 'POST',
    headers: createAuthorizedHeaders('application/json'),
    body: JSON.stringify(payload),
  });
}

async function generateAtmosphereBlob(
  layer: AtmosphereLayer,
  durationSeconds: number
): Promise<Blob> {
  const payload = {
    prompt: layer.prompt.trim(),
    music_length_ms: Math.max(3000, Math.round(durationSeconds * 1000)),
    model_id: 'music_v1',
  };

  return fetchBinaryWithFallback(['music'], {
    method: 'POST',
    headers: createAuthorizedHeaders('application/json'),
    body: JSON.stringify(payload),
  });
}

export async function generateAmbientPreviewAudio(prompt: string): Promise<Blob> {
  return generateSoundEffectBlob(
    {
      type: 'sfx',
      prompt,
      volume: 0.15,
      loop: true,
    },
    PREVIEW_DURATION_SECONDS
  );
}

export async function generateSoundscapeAudio(
  recipe: SoundscapeRecipe
): Promise<GeneratedLayerAudio> {
  const taskDefinitions: Array<{
    layerType: LayerType;
    promise: Promise<Blob>;
  }> = [];

  if (recipe.layers.ambient.prompt.trim()) {
    taskDefinitions.push({
      layerType: 'ambient',
      promise: generateSoundEffectBlob(
        recipe.layers.ambient,
        DEFAULT_RENDER_DURATION_SECONDS
      ),
    });
  }

  if (recipe.layers.signature.prompt.trim()) {
    taskDefinitions.push({
      layerType: 'signature',
      promise: generateSoundEffectBlob(
        recipe.layers.signature,
        DEFAULT_RENDER_DURATION_SECONDS
      ),
    });
  }

  if (recipe.layers.dialogue.text.trim()) {
    taskDefinitions.push({
      layerType: 'dialogue',
      promise: generateDialogueBlob(recipe.layers.dialogue),
    });
  }

  if (recipe.layers.secondaryDialogue.text.trim()) {
    taskDefinitions.push({
      layerType: 'secondaryDialogue',
      promise: generateDialogueBlob(recipe.layers.secondaryDialogue),
    });
  }

  if (recipe.layers.atmosphere.prompt.trim()) {
    taskDefinitions.push({
      layerType: 'atmosphere',
      promise: generateAtmosphereBlob(
        recipe.layers.atmosphere,
        DEFAULT_RENDER_DURATION_SECONDS
      ),
    });
  }

  const settledResults = await Promise.allSettled(
    taskDefinitions.map((taskDefinition) => taskDefinition.promise)
  );
  const blobs: AudioBlobMap = {};
  const failedLayers: LayerType[] = [];

  settledResults.forEach((result, index) => {
    const { layerType } = taskDefinitions[index];
    if (result.status === 'fulfilled') {
      blobs[layerType] = result.value;
      return;
    }

    failedLayers.push(layerType);
  });

  const expectedLayers: LayerType[] = ['ambient', 'signature', 'dialogue', 'secondaryDialogue', 'atmosphere'];
  for (const layerType of expectedLayers) {
    if (
      !(layerType in blobs) &&
      !failedLayers.includes(layerType) &&
      shouldRequestLayer(recipe, layerType)
    ) {
      failedLayers.push(layerType);
    }
  }

  return { blobs, failedLayers };
}

function shouldRequestLayer(recipe: SoundscapeRecipe, layerType: LayerType): boolean {
  switch (layerType) {
    case 'ambient':
      return recipe.layers.ambient.prompt.trim().length > 0;
    case 'signature':
      return recipe.layers.signature.prompt.trim().length > 0;
    case 'dialogue':
      return recipe.layers.dialogue.text.trim().length > 0;
    case 'secondaryDialogue':
      return recipe.layers.secondaryDialogue.text.trim().length > 0;
    case 'atmosphere':
      return recipe.layers.atmosphere.prompt.trim().length > 0;
  }
}

export async function generateDynamicEventAudio(prompt: string): Promise<Blob> {
  return fetchBinaryWithFallback(['sound-generation'], {
    method: 'POST',
    headers: createAuthorizedHeaders('application/json'),
    body: JSON.stringify({
      text: normalizeSoundEffectPrompt(prompt),
      duration_seconds: 6,
      prompt_influence: 0.35,
    }),
  });
}
