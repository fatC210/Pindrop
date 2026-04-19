/**
 * API key validation and utility functions for the Settings UI module.
 * Handles format validation and masking for ElevenLabs API keys.
 *
 * @module apiKeyUtils
 */

import type { ValidationResult, VerificationResult } from './types';

/**
 * Regex pattern for a likely valid ElevenLabs API key.
 *
 * Keep the client-side check permissive so we do not reject newer key shapes
 * that are still valid upstream. Authenticity is confirmed by the verification
 * request to ElevenLabs.
 */
const API_KEY_PATTERN = /^sk[-_][A-Za-z0-9][A-Za-z0-9_-]{15,}$/;
const MASKED_KEY_SUFFIX = '•'.repeat(22);

/**
 * Normalizes an API key for validation, storage, and outbound requests.
 *
 * @param apiKey - Raw API key input
 * @returns The trimmed API key
 */
export function normalizeApiKey(apiKey: string): string {
  return apiKey.trim();
}

/**
 * Masks an API key for safe display in the UI.
 *
 * Returns a fixed masked string while preserving the visible `sk-` / `sk_`
 * prefix family. Returns an empty string for empty or very short inputs
 * (fewer than 3 characters).
 *
 * Masking is idempotent: calling maskApiKey on an already-masked value
 * produces the same result.
 *
 * @param apiKey - The API key string to mask
 * @returns The masked representation, or '' for empty/short inputs
 *
 * @example
 * ```ts
 * maskApiKey('sk_abcdefghijklmnopqrstuvwxyz012345');
 * // => 'sk_••••••••••••••••••••••'
 *
 * maskApiKey('');
 * // => ''
 * ```
 *
 * Validates: Requirements 1.2, 1.6, 3.6
 */
export function maskApiKey(apiKey: string): string {
  const normalizedApiKey = normalizeApiKey(apiKey);

  if (!normalizedApiKey || normalizedApiKey.length < 3) {
    return '';
  }

  const maskedPrefix = normalizedApiKey.startsWith('sk_') ? 'sk_' : 'sk-';
  return maskedPrefix + MASKED_KEY_SUFFIX;
}

/**
 * Validates that an API key string matches the expected ElevenLabs format.
 *
 * The key must use an `sk-` or `sk_` prefix and contain a sufficiently long
 * URL-safe token body. The check intentionally stays permissive so that newer
 * ElevenLabs key variants are not rejected by the UI before remote
 * verification runs.
 *
 * @param apiKey - The API key string to validate
 * @returns A ValidationResult indicating whether the key format is valid
 *
 * @example
 * ```ts
 * validateApiKeyFormat('sk_abcdefghijklmnopqrstuvwxyz012345');
 * // => { isValid: true }
 *
 * validateApiKeyFormat('invalid-key');
 * // => { isValid: false, error: 'Invalid API Key format' }
 * ```
 *
 * Validates: Requirements 1.3, 1.4
 */
export function validateApiKeyFormat(apiKey: string): ValidationResult {
  const normalizedApiKey = normalizeApiKey(apiKey);

  if (API_KEY_PATTERN.test(normalizedApiKey)) {
    return { isValid: true };
  }

  return { isValid: false, error: 'INVALID_FORMAT' };
}

/**
 * Verifies an API key against the ElevenLabs user subscription endpoint.
 *
 * Sends a GET request directly to the ElevenLabs API at
 * `https://api.elevenlabs.io/v1/user/subscription` with the provided key in
 * the `xi-api-key` header. Returns a
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
 * const result = await verifyApiKey('sk_abcdefghijklmnopqrstuvwxyz012345');
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
  const normalizedApiKey = normalizeApiKey(apiKey);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'xi-api-key': normalizedApiKey,
      },
    });

    if (!response.ok) {
      return {
        isValid: false,
        error: 'INVALID_OR_EXPIRED',
      };
    }

    // User feedback: Do NOT display balance
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
