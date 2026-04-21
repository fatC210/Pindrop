import type { LlmEnhancementConfig } from './preferencesStore';
import type { LlmVerificationResult } from './types';

export function buildLlmChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

export async function verifyLlmConfiguration(
  config: LlmEnhancementConfig,
): Promise<LlmVerificationResult> {
  try {
    const response = await fetch(buildLlmChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 1,
        messages: [
          {
            role: 'user',
            content: 'Reply with the single word pong.',
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        isValid: false,
        error: 'INVALID_CONFIGURATION',
      };
    }

    return {
      isValid: true,
    };
  } catch {
    return {
      isValid: false,
      error: 'CONNECTION_FAILED',
    };
  }
}
