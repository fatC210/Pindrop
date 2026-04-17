/**
 * Unit tests for API key validation utilities.
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 1.3, 1.4
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { maskApiKey, validateApiKeyFormat, verifyApiKey } from '../apiKeyUtils';

describe('validateApiKeyFormat', () => {
  test('returns valid for a correctly formatted API key', () => {
    const result = validateApiKeyFormat('xi-abcdefghijklmnopqrstuvwxyz012345');
    expect(result).toEqual({ isValid: true });
  });

  test('returns valid for key with mixed case alphanumeric characters', () => {
    const result = validateApiKeyFormat('xi-AbCdEfGhIjKlMnOpQrStUvWxYz012345');
    expect(result).toEqual({ isValid: true });
  });

  test('returns valid for key with all digits after prefix', () => {
    const result = validateApiKeyFormat('xi-01234567890123456789012345678901');
    expect(result).toEqual({ isValid: true });
  });

  test('returns invalid with error for empty string', () => {
    const result = validateApiKeyFormat('');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key missing xi- prefix', () => {
    const result = validateApiKeyFormat('abcdefghijklmnopqrstuvwxyz01234567');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key with wrong prefix', () => {
    const result = validateApiKeyFormat('sk-abcdefghijklmnopqrstuvwxyz012345');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key that is too short', () => {
    const result = validateApiKeyFormat('xi-abc');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key that is too long', () => {
    const result = validateApiKeyFormat('xi-abcdefghijklmnopqrstuvwxyz0123456');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key with special characters after prefix', () => {
    const result = validateApiKeyFormat('xi-abcdefghijklmnopqrstuvwxyz01234!');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key with spaces', () => {
    const result = validateApiKeyFormat('xi- bcdefghijklmnopqrstuvwxyz012345');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('returns invalid for key with underscores after prefix', () => {
    const result = validateApiKeyFormat('xi-abcdefghijklmnopqrstuvwxyz01234_');
    expect(result).toEqual({ isValid: false, error: 'Invalid API Key format' });
  });

  test('key must be exactly 35 characters total', () => {
    // 3 (prefix) + 32 (alphanumeric) = 35
    const validKey = 'xi-' + 'a'.repeat(32);
    expect(validKey.length).toBe(35);
    expect(validateApiKeyFormat(validKey).isValid).toBe(true);

    const shortKey = 'xi-' + 'a'.repeat(31);
    expect(validateApiKeyFormat(shortKey).isValid).toBe(false);

    const longKey = 'xi-' + 'a'.repeat(33);
    expect(validateApiKeyFormat(longKey).isValid).toBe(false);
  });
});


/**
 * Unit tests for API key masking utility.
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 1.2, 1.6, 3.6
 */
describe('maskApiKey', () => {
  const EXPECTED_MASK = 'sk-' + '•'.repeat(22);

  test('returns fixed masked format for a valid API key', () => {
    const result = maskApiKey('xi-abcdefghijklmnopqrstuvwxyz012345');
    expect(result).toBe(EXPECTED_MASK);
  });

  test('masked output has correct length (25 characters: 3 prefix + 22 dots)', () => {
    const result = maskApiKey('xi-abcdefghijklmnopqrstuvwxyz012345');
    expect(result.length).toBe(25);
    expect(result.slice(0, 3)).toBe('sk-');
    expect(result.slice(3)).toBe('•'.repeat(22));
  });

  test('returns empty string for empty input', () => {
    expect(maskApiKey('')).toBe('');
  });

  test('returns empty string for single character', () => {
    expect(maskApiKey('a')).toBe('');
  });

  test('returns empty string for two characters', () => {
    expect(maskApiKey('ab')).toBe('');
  });

  test('returns masked format for exactly 3 characters', () => {
    expect(maskApiKey('abc')).toBe(EXPECTED_MASK);
  });

  test('returns same masked output regardless of input content', () => {
    const key1 = maskApiKey('xi-abcdefghijklmnopqrstuvwxyz012345');
    const key2 = maskApiKey('xi-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
    const key3 = maskApiKey('some-random-string');
    expect(key1).toBe(EXPECTED_MASK);
    expect(key2).toBe(EXPECTED_MASK);
    expect(key3).toBe(EXPECTED_MASK);
  });

  test('masking is idempotent (masking a masked value returns the same result)', () => {
    const firstMask = maskApiKey('xi-abcdefghijklmnopqrstuvwxyz012345');
    const secondMask = maskApiKey(firstMask);
    expect(secondMask).toBe(firstMask);
  });
});


/**
 * Unit tests for API key verification utility.
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */
describe('verifyApiKey', () => {
  const VALID_KEY = 'xi-abcdefghijklmnopqrstuvwxyz012345';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('returns isValid true when the API responds with ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ tier: 'free' }), { status: 200 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: true });
  });

  test('sends GET request to /api/elevenlabs/user/subscription', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await verifyApiKey(VALID_KEY);

    expect(fetchSpy).toHaveBeenCalledWith('/api/elevenlabs/user/subscription', {
      method: 'GET',
      headers: {
        'x-elevenlabs-api-key': VALID_KEY,
      },
    });
  });

  test('returns isValid false with error when API responds with 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: false, error: 'Key invalid or expired' });
  });

  test('returns isValid false with error when API responds with 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: false, error: 'Key invalid or expired' });
  });

  test('returns isValid false with error when API responds with 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: false, error: 'Key invalid or expired' });
  });

  test('returns connection error when fetch throws a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({
      isValid: false,
      error: 'Verification failed. Check connection.',
    });
  });

  test('returns connection error when fetch throws a generic error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network timeout'));

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({
      isValid: false,
      error: 'Verification failed. Check connection.',
    });
  });

  test('does not include the API key in the returned error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 401 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result.error).not.toContain(VALID_KEY);
  });

  test('does not include the API key in the network error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'));

    const result = await verifyApiKey(VALID_KEY);
    expect(result.error).not.toContain(VALID_KEY);
  });

  test('does not return balance information on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          tier: 'starter',
          character_count: 1000,
          next_character_count_reset_unix: 1700000000,
        }),
        { status: 200 },
      ),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: true });
    expect(result).not.toHaveProperty('balance');
    expect(result).not.toHaveProperty('tier');
  });
});
