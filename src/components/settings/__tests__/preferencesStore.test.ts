/**
 * Unit tests for preferencesStore module.
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 1.5, 3.1, 3.3
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  API_KEY_KEY,
  validatePreferences,
  PreferencesStore,
  storeApiKey,
  retrieveApiKey,
  clearApiKey,
} from '../preferencesStore';
import type { UserPreferences } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    layerVolumes: { ...DEFAULT_PREFERENCES.layerVolumes },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validatePreferences
// ---------------------------------------------------------------------------

describe('validatePreferences', () => {
  test('returns correct structure for fully valid input', () => {
    const input: UserPreferences = {
      mapStyle: 'dark',
      autoPlay: false,
      fadeInDuration: 2.0,
      dynamicEvents: false,
      masterVolume: 0.5,
      layerVolumes: {
        ambient: 0.3,
        signature: 0.4,
        dialogue: 0.6,
        secondaryDialogue: 0.2,
        atmosphere: 0.1,
      },
    };

    const result = validatePreferences(input);

    expect(result.mapStyle).toBe('dark');
    expect(result.autoPlay).toBe(false);
    expect(result.fadeInDuration).toBe(2.0);
    expect(result.dynamicEvents).toBe(false);
    expect(result.masterVolume).toBe(0.5);
    expect(result.layerVolumes.ambient).toBe(0.3);
    expect(result.layerVolumes.signature).toBe(0.4);
    expect(result.layerVolumes.dialogue).toBe(0.6);
    expect(result.layerVolumes.secondaryDialogue).toBe(0.2);
    expect(result.layerVolumes.atmosphere).toBe(0.1);
  });

  test('invalid mapStyle falls back to "light"', () => {
    expect(validatePreferences({ mapStyle: 'blue' }).mapStyle).toBe('light');
    expect(validatePreferences({ mapStyle: 'light' }).mapStyle).toBe('light');
    expect(validatePreferences({ mapStyle: 123 }).mapStyle).toBe('light');
    expect(validatePreferences({ mapStyle: null }).mapStyle).toBe('light');
  });

  test('valid mapStyle "dark" is accepted', () => {
    expect(validatePreferences({ mapStyle: 'dark' }).mapStyle).toBe('dark');
  });

  test('out-of-range masterVolume falls back to default 0.8', () => {
    expect(validatePreferences({ masterVolume: -0.1 }).masterVolume).toBe(0.8);
    expect(validatePreferences({ masterVolume: 1.1 }).masterVolume).toBe(0.8);
    expect(validatePreferences({ masterVolume: 'loud' }).masterVolume).toBe(0.8);
  });

  test('boundary volume values 0 and 1 are accepted', () => {
    expect(validatePreferences({ masterVolume: 0 }).masterVolume).toBe(0);
    expect(validatePreferences({ masterVolume: 1 }).masterVolume).toBe(1);
  });

  test('out-of-range layer volumes fall back to their defaults', () => {
    const result = validatePreferences({
      layerVolumes: {
        ambient: 2,
        signature: -1,
        dialogue: 'loud',
        secondaryDialogue: null,
        atmosphere: undefined,
      },
    });

    expect(result.layerVolumes.ambient).toBe(0.7);
    expect(result.layerVolumes.signature).toBe(0.6);
    expect(result.layerVolumes.dialogue).toBe(0.8);
    expect(result.layerVolumes.secondaryDialogue).toBe(0.5);
    expect(result.layerVolumes.atmosphere).toBe(0.4);
  });

  test('invalid fadeInDuration falls back to 1.5', () => {
    expect(validatePreferences({ fadeInDuration: 0.9 }).fadeInDuration).toBe(1.5);
    expect(validatePreferences({ fadeInDuration: 4 }).fadeInDuration).toBe(1.5);
    expect(validatePreferences({ fadeInDuration: 'fast' }).fadeInDuration).toBe(1.5);
    expect(validatePreferences({ fadeInDuration: null }).fadeInDuration).toBe(1.5);
  });

  test('all valid fadeInDuration values are accepted', () => {
    for (const dur of [0.5, 1.0, 1.5, 2.0, 3.0] as const) {
      expect(validatePreferences({ fadeInDuration: dur }).fadeInDuration).toBe(dur);
    }
  });

  test('non-boolean autoPlay falls back to true', () => {
    expect(validatePreferences({ autoPlay: 'yes' }).autoPlay).toBe(true);
    expect(validatePreferences({ autoPlay: 1 }).autoPlay).toBe(true);
    expect(validatePreferences({ autoPlay: null }).autoPlay).toBe(true);
  });

  test('boolean autoPlay values are accepted', () => {
    expect(validatePreferences({ autoPlay: false }).autoPlay).toBe(false);
    expect(validatePreferences({ autoPlay: true }).autoPlay).toBe(true);
  });

  test('non-boolean dynamicEvents falls back to true', () => {
    expect(validatePreferences({ dynamicEvents: 0 }).dynamicEvents).toBe(true);
    expect(validatePreferences({ dynamicEvents: 'no' }).dynamicEvents).toBe(true);
  });

  test('non-object input returns full defaults', () => {
    const result = validatePreferences(null);
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  test('string input returns full defaults', () => {
    const result = validatePreferences('not-an-object');
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  test('array input returns full defaults', () => {
    const result = validatePreferences([1, 2, 3]);
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  test('number input returns full defaults', () => {
    const result = validatePreferences(42);
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  test('empty object returns all defaults', () => {
    const result = validatePreferences({});
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  test('missing layerVolumes object falls back to all layer defaults', () => {
    const result = validatePreferences({ mapStyle: 'dark' });
    expect(result.layerVolumes).toEqual(DEFAULT_PREFERENCES.layerVolumes);
  });
});

// ---------------------------------------------------------------------------
// PreferencesStore
// ---------------------------------------------------------------------------

describe('PreferencesStore', () => {
  let store: PreferencesStore;

  beforeEach(() => {
    store = new PreferencesStore();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // isLocalStorageAvailable
  describe('isLocalStorageAvailable', () => {
    test('returns true in jsdom environment', () => {
      expect(store.isLocalStorageAvailable()).toBe(true);
    });

    test('returns false when localStorage throws on setItem', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(store.isLocalStorageAvailable()).toBe(false);
    });

    test('returns a boolean', () => {
      expect(typeof store.isLocalStorageAvailable()).toBe('boolean');
    });
  });

  // loadPreferences
  describe('loadPreferences', () => {
    test('returns defaults when localStorage is empty', () => {
      const result = store.loadPreferences();
      expect(result).toEqual(DEFAULT_PREFERENCES);
    });

    test('returns stored preferences when valid JSON is present', () => {
      const prefs = makeValidPreferences({ mapStyle: 'dark', autoPlay: false });
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));

      const result = store.loadPreferences();
      expect(result.mapStyle).toBe('dark');
      expect(result.autoPlay).toBe(false);
    });

    test('returns defaults when stored JSON is invalid', () => {
      localStorage.setItem(PREFERENCES_KEY, 'not-valid-json{{{');
      const result = store.loadPreferences();
      expect(result).toEqual(DEFAULT_PREFERENCES);
    });

    test('validates and corrects invalid stored values', () => {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ mapStyle: 'purple', masterVolume: 99 }),
      );
      const result = store.loadPreferences();
      expect(result.mapStyle).toBe('light');
      expect(result.masterVolume).toBe(0.8);
    });

    test('returns defaults and warns when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('unavailable');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = store.loadPreferences();
      expect(result).toEqual(DEFAULT_PREFERENCES);
      expect(warnSpy).toHaveBeenCalledWith(
        '[PinDrop] localStorage unavailable, using defaults',
      );
    });
  });

  // savePreferences
  describe('savePreferences', () => {
    test('persists preferences to localStorage', () => {
      const prefs = makeValidPreferences({ mapStyle: 'dark', masterVolume: 0.5 });
      store.savePreferences(prefs);

      const raw = localStorage.getItem(PREFERENCES_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.mapStyle).toBe('dark');
      expect(parsed.masterVolume).toBe(0.5);
    });

    test('validates preferences before saving', () => {
      const invalid = { mapStyle: 'rainbow', masterVolume: 999 } as unknown as UserPreferences;
      store.savePreferences(invalid);

      const raw = localStorage.getItem(PREFERENCES_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.mapStyle).toBe('light');
      expect(parsed.masterVolume).toBe(0.8);
    });

    test('warns and does not throw when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('unavailable');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => store.savePreferences(makeValidPreferences())).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[PinDrop] localStorage unavailable, cannot save preferences',
      );
    });

    test('logs error when setItem throws after availability check passes', () => {
      // Make isLocalStorageAvailable return true but setItem fail on the real call
      let callCount = 0;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        callCount++;
        // First call is the availability test key, second is the real save
        if (callCount > 1) {
          throw new Error('write error');
        }
      });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        return key === '__pindrop_ls_test__' ? '__pindrop_ls_test__' : null;
      });
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      store.savePreferences(makeValidPreferences());
      expect(errorSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to save preferences:',
        expect.any(Error),
      );
    });
  });

  // getDefaultPreferences
  describe('getDefaultPreferences', () => {
    test('returns a copy of DEFAULT_PREFERENCES', () => {
      const result = store.getDefaultPreferences();
      expect(result).toEqual(DEFAULT_PREFERENCES);
    });

    test('returns a new object each call (not the same reference)', () => {
      const a = store.getDefaultPreferences();
      const b = store.getDefaultPreferences();
      expect(a).not.toBe(b);
    });

    test('mutating the returned object does not affect DEFAULT_PREFERENCES', () => {
      const result = store.getDefaultPreferences();
      result.mapStyle = 'dark';
      expect(DEFAULT_PREFERENCES.mapStyle).toBe('light');
    });
  });
});

// ---------------------------------------------------------------------------
// API key storage functions
// ---------------------------------------------------------------------------

describe('storeApiKey / retrieveApiKey / clearApiKey', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('storeApiKey persists the key and retrieveApiKey returns it', () => {
    storeApiKey('xi-testkey12345678901234567890123456');
    expect(retrieveApiKey()).toBe('xi-testkey12345678901234567890123456');
  });

  test('retrieveApiKey returns null when no key is stored', () => {
    expect(retrieveApiKey()).toBeNull();
  });

  test('clearApiKey removes the stored key', () => {
    storeApiKey('xi-testkey12345678901234567890123456');
    clearApiKey();
    expect(retrieveApiKey()).toBeNull();
  });

  test('round-trip: store → retrieve → clear → retrieve returns null', () => {
    storeApiKey('xi-roundtrip1234567890123456789012');
    expect(retrieveApiKey()).toBe('xi-roundtrip1234567890123456789012');
    clearApiKey();
    expect(retrieveApiKey()).toBeNull();
  });

  test('storeApiKey does not log the key to console', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const key = 'xi-secretkey1234567890123456789012';
    storeApiKey(key);

    for (const spy of [logSpy, infoSpy, debugSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(key);
      }
    }
  });

  test('storeApiKey logs error (without key) when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const key = 'xi-failkey12345678901234567890123456';
    storeApiKey(key);

    expect(errorSpy).toHaveBeenCalledWith('[PinDrop Error] Failed to store API key');
    // Ensure the key itself is not in the error log
    const allArgs = errorSpy.mock.calls.flat().join(' ');
    expect(allArgs).not.toContain(key);
  });

  test('retrieveApiKey returns null when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(retrieveApiKey()).toBeNull();
  });

  test('clearApiKey does not throw when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(() => clearApiKey()).not.toThrow();
  });

  test('uses the correct storage key (API_KEY_KEY)', () => {
    storeApiKey('xi-keycheck1234567890123456789012');
    expect(localStorage.getItem(API_KEY_KEY)).toBe('xi-keycheck1234567890123456789012');
  });
});
