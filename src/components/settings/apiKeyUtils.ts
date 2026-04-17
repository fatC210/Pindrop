/**
 * API key validation and utility functions for the Settings UI module.
 * Handles format validation and masking for ElevenLabs API keys.
 *
 * @module apiKeyUtils
 */

import type { ValidationResult, VerificationResult } from './types';

/**
 * Regex pattern for a valid ElevenLabs API key.
 * Format: "xi-" prefix followed by exactly 32 alphanumeric characters.
 */
const API_KEY_PATTERN = /^xi-[a-zA-Z0-9]{32}$/;

/**
 * Masks an API key for safe display in the UI.
 *
 * Returns a fixed masked string `sk-••••••••••••••••••••••` (3-char prefix + 22 bullet chars)
 * regardless of the actual key content. Returns an empty string for empty or
 * very short inputs (fewer than 3 characters).
 *
 * Masking is idempotent: calling maskApiKey on an already-masked value
 * produces the same result.
 *
 * @param apiKey - The API key string to mask
 * @returns The masked representation, or '' for empty/short inputs
 *
 * @example
 * ```ts
 * maskApiKey('xi-abcdefghijklmnopqrstuvwxyz012345');
 * // => 'sk-••••••••••••••••••••••'
 *
 * maskApiKey('');
 * // => ''
 * ```
 *
 * Validates: Requirements 1.2, 1.6, 3.6
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 3) {
    return '';
  }

  return 'sk-' + '•'.repeat(22);
}

/**
 * Validates that an API key string matches the expected ElevenLabs format.
 *
 * The key must be exactly 35 characters: a 3-character prefix "xi-"
 * followed by 32 alphanumeric characters (a-z, A-Z, 0-9).
 *
 * @param apiKey - The API key string to validate
 * @returns A ValidationResult indicating whether the key format is valid
 *
 * @example
 * ```ts
 * validateApiKeyFormat('xi-abcdefghijklmnopqrstuvwxyz012345');
 * // => { isValid: true }
 *
 * validateApiKeyFormat('invalid-key');
 * // => { isValid: false, error: 'Invalid API Key format' }
 * ```
 *
 * Validates: Requirements 1.3, 1.4
 */
export function validateApiKeyFormat(apiKey: string): ValidationResult {
  if (API_KEY_PATTERN.test(apiKey)) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid API Key format' };
}

/**
 * Verifies an API key against the ElevenLabs user subscription endpoint.
 *
 * Sends a GET request to the local proxy at `/api/elevenlabs/user/subscription`
 * with the provided key in the `x-elevenlabs-api-key` header. Returns a
 * {@link VerificationResult} indicating whether the key is valid.
 *
 * The function never logs the API key to the console and does not expose
 * balance information (per user feedback).
 *
 * @param apiKey - The ElevenLabs API key to verify
 * @returns A promise resolving to a VerificationResult
 *
 * @example
 * ```ts
 * const result = await verifyApiKey('xi-abcdefghijklmnopqrstuvwxyz012345');
 * if (result.isValid) {
 *   // key is good
 * } else {
 *   console.error(result.error);
 * }
 * ```
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */
export async function verifyApiKey(apiKey: string): Promise<VerificationResult> {
  try {
    const response = await fetch('/api/elevenlabs/user/subscription', {
      method: 'GET',
      headers: {
        'x-elevenlabs-api-key': apiKey,
      },
    });

    if (!response.ok) {
      return {
        isValid: false,
        error: 'Key invalid or expired',
      };
    }

    // User feedback: Do NOT display balance
    return {
      isValid: true,
    };
  } catch {
    return {
      isValid: false,
      error: 'Verification failed. Check connection.',
    };
  }
}
