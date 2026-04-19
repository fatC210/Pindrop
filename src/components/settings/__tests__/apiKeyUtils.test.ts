/**
 * Unit tests for API key validation utilities.
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 1.3, 1.4
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  maskApiKey,
  normalizeApiKey,
  validateApiKeyFormat,
  verifyApiKey,
} from '../apiKeyUtils';

const LEGACY_VALID_KEY = 'sk-abcdefghijklmnopqrstuvwxyz012345';
const CURRENT_VALID_KEY = 'sk_abcdefghijklmnopqrstuvwxyz0123456789';

describe('normalizeApiKey', () => {
  test('trims surrounding whitespace', () => {
    expect(normalizeApiKey(`  ${CURRENT_VALID_KEY}\n`)).toBe(CURRENT_VALID_KEY);
  });
});

describe('validateApiKeyFormat', () => {
  test('returns valid for a correctly formatted current API key', () => {
    const result = validateApiKeyFormat(CURRENT_VALID_KEY);
    expect(result).toEqual({ isValid: true });
  });

  test('returns valid for a correctly formatted legacy API key', () => {
    const result = validateApiKeyFormat(LEGACY_VALID_KEY);
    expect(result).toEqual({ isValid: true });
  });

  test('returns valid for key with mixed case alphanumeric characters', () => {
    const result = validateApiKeyFormat('sk_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
    expect(result).toEqual({ isValid: true });
  });

  test('returns valid for key with hyphen and underscore in the token body', () => {
    const result = validateApiKeyFormat('sk_abcdEFGHijklMNOP_qrst-uvwxyZ012345');
    expect(result).toEqual({ isValid: true });
  });

  test('returns valid for a key with surrounding whitespace after trimming', () => {
    const result = validateApiKeyFormat(`  ${CURRENT_VALID_KEY}\r\n`);
    expect(result).toEqual({ isValid: true });
  });

  test('returns invalid with error for empty string', () => {
    const result = validateApiKeyFormat('');
    expect(result).toEqual({ isValid: false, error: 'INVALID_FORMAT' });
  });

  test('returns invalid for key missing sk prefix', () => {
    const result = validateApiKeyFormat('abcdefghijklmnopqrstuvwxyz01234567');
    expect(result).toEqual({ isValid: false, error: 'INVALID_FORMAT' });
  });

  test('returns invalid for key with wrong prefix', () => {
    const result = validateApiKeyFormat('xi_abcdefghijklmnopqrstuvwxyz0123456789');
    expect(result).toEqual({ isValid: false, error: 'INVALID_FORMAT' });
  });

  test('returns invalid for key that is too short', () => {
    const result = validateApiKeyFormat('sk_abc');
    expect(result).toEqual({ isValid: false, error: 'INVALID_FORMAT' });
  });

  test('returns invalid for key with spaces inside token body', () => {
    const result = validateApiKeyFormat('sk_abc defghijklmnopqrstuvwxyz012345');
    expect(result).toEqual({ isValid: false, error: 'INVALID_FORMAT' });
  });

  test('returns invalid for key with unsupported special characters after prefix', () => {
    const result = validateApiKeyFormat('sk_abcdefghijklmnopqrstuvwxyz01234!');
    expect(result).toEqual({ isValid: false, error: 'INVALID_FORMAT' });
  });

  test('requires a sufficiently long token after the prefix', () => {
    const validKey = 'sk_' + 'a'.repeat(16);
    expect(validateApiKeyFormat(validKey).isValid).toBe(true);

    const shortKey = 'sk_' + 'a'.repeat(15);
    expect(validateApiKeyFormat(shortKey).isValid).toBe(false);
  });
});


/**
 * Unit tests for API key masking utility.
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 1.2, 1.6, 3.6
 */
describe('maskApiKey', () => {
  const EXPECTED_DASH_MASK = 'sk-' + '•'.repeat(22);
  const EXPECTED_UNDERSCORE_MASK = 'sk_' + '•'.repeat(22);

  test('returns fixed masked format for a legacy API key', () => {
    const result = maskApiKey(LEGACY_VALID_KEY);
    expect(result).toBe(EXPECTED_DASH_MASK);
  });

  test('returns fixed masked format for a current API key', () => {
    const result = maskApiKey(CURRENT_VALID_KEY);
    expect(result).toBe(EXPECTED_UNDERSCORE_MASK);
  });

  test('masked output has correct length (25 characters: 3 prefix + 22 dots)', () => {
    const result = maskApiKey(CURRENT_VALID_KEY);
    expect(result.length).toBe(25);
    expect(result.slice(0, 3)).toBe('sk_');
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
    expect(maskApiKey('sk_')).toBe(EXPECTED_UNDERSCORE_MASK);
  });

  test('returns same masked output regardless of input content in the same prefix family', () => {
    const key1 = maskApiKey(CURRENT_VALID_KEY);
    const key2 = maskApiKey('sk_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
    const key3 = maskApiKey('sk_some-random-string');
    expect(key1).toBe(EXPECTED_UNDERSCORE_MASK);
    expect(key2).toBe(EXPECTED_UNDERSCORE_MASK);
    expect(key3).toBe(EXPECTED_UNDERSCORE_MASK);
  });

  test('masking is idempotent (masking a masked value returns the same result)', () => {
    const firstMask = maskApiKey(CURRENT_VALID_KEY);
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
  const VALID_KEY = CURRENT_VALID_KEY;

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

  test('trims the key before sending GET request to ElevenLabs directly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await verifyApiKey(` ${VALID_KEY}\n`);

    expect(fetchSpy).toHaveBeenCalledWith('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'xi-api-key': VALID_KEY,
      },
    });
  });

  test('returns isValid false with error when API responds with 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: false, error: 'INVALID_OR_EXPIRED' });
  });

  test('returns isValid false with error when API responds with 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: false, error: 'INVALID_OR_EXPIRED' });
  });

  test('returns isValid false with error when API responds with 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({ isValid: false, error: 'INVALID_OR_EXPIRED' });
  });

  test('returns connection error when fetch throws a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({
      isValid: false,
      error: 'CONNECTION_FAILED',
    });
  });

  test('returns connection error when fetch throws a generic error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network timeout'));

    const result = await verifyApiKey(VALID_KEY);
    expect(result).toEqual({
      isValid: false,
      error: 'CONNECTION_FAILED',
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
