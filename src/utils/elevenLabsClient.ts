import type {
  AmbientLayer,
  AtmosphereLayer,
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

export interface GeneratedLayerAudio {
  blobs: AudioBlobMap;
  failedLayers: LayerType[];
  failureMessages: Partial<Record<LayerType, string>>;
}

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

function formatLayerFailureMessage(
  layerType: LayerType,
  message: string
): string {
  switch (layerType) {
    case 'ambient':
      return `Ambient generation failed: ${message}`;
    case 'signature':
      return `Signature generation failed: ${message}`;
    case 'dialogue':
      return `Dialogue generation failed: ${message}`;
    case 'secondaryDialogue':
      return `Secondary dialogue generation failed: ${message}`;
    case 'atmosphere':
      return `Atmosphere generation failed: ${message}`;
  }
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
  const failureMessages: Partial<Record<LayerType, string>> = {};

  settledResults.forEach((result, index) => {
    const { layerType } = taskDefinitions[index];
    if (result.status === 'fulfilled') {
      blobs[layerType] = result.value;
      return;
    }

    failedLayers.push(layerType);
    failureMessages[layerType] = formatLayerFailureMessage(
      layerType,
      getErrorMessage(result.reason)
    );
  });

  const expectedLayers: LayerType[] = ['ambient', 'signature', 'atmosphere'];
  for (const layerType of expectedLayers) {
    if (
      !(layerType in blobs) &&
      !failedLayers.includes(layerType) &&
      shouldRequestLayer(recipe, layerType)
    ) {
      failedLayers.push(layerType);
    }
  }

  if (failedLayers.length > 0) {
    console.warn('[PinDrop Warning] ElevenLabs layer generation failed:', {
      recipeId: recipe.id,
      location: {
        cityName: recipe.location.cityName,
        regionName: recipe.location.regionName ?? null,
        countryName: recipe.location.countryName,
      },
      failedLayers,
      failureMessages,
    });
  }

  return { blobs, failedLayers, failureMessages };
}

function shouldRequestLayer(recipe: SoundscapeRecipe, layerType: LayerType): boolean {
  switch (layerType) {
    case 'ambient':
      return recipe.layers.ambient.prompt.trim().length > 0;
    case 'signature':
      return recipe.layers.signature.prompt.trim().length > 0;
    case 'dialogue':
    case 'secondaryDialogue':
      return false;
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
