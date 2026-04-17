/**
 * Preferences store for managing user settings persistence in localStorage.
 * Handles loading, saving, and validation of UserPreferences.
 *
 * @module preferencesStore
 */

import type { UserPreferences, FadeInDuration } from './types';

// ---------------------------------------------------------------------------
// Storage key constants
// ---------------------------------------------------------------------------

/** localStorage key for persisted user preferences */
export const PREFERENCES_KEY = 'pindrop_preferences';

/** localStorage key for the ElevenLabs API key */
export const API_KEY_KEY = 'pindrop_api_key';

// ---------------------------------------------------------------------------
// Default preferences
// ---------------------------------------------------------------------------

/**
 * Default values for all user preferences.
 * Used when no preferences are stored or when stored values are invalid.
 *
 * Validates: Requirements 11.6
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  mapStyle: 'light',
  autoPlay: true,
  fadeInDuration: 1.5,
  dynamicEvents: true,
  masterVolume: 0.8,
  layerVolumes: {
    ambient: 0.7,
    signature: 0.6,
    dialogue: 0.8,
    secondaryDialogue: 0.5,
    atmosphere: 0.4,
  },
};

// ---------------------------------------------------------------------------
// Validation helpers (private)
// ---------------------------------------------------------------------------

const VALID_FADE_IN_DURATIONS: FadeInDuration[] = [0.5, 1.0, 1.5, 2.0, 3.0];

function validateVolume(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && value >= 0 && value <= 1) {
    return value;
  }
  return defaultValue;
}

function validateFadeInDuration(value: unknown): FadeInDuration {
  if (
    typeof value === 'number' &&
    (VALID_FADE_IN_DURATIONS as number[]).includes(value)
  ) {
    return value as FadeInDuration;
  }
  return 1.5;
}

// ---------------------------------------------------------------------------
// validatePreferences
// ---------------------------------------------------------------------------

/**
 * Validates an unknown value as UserPreferences, replacing any invalid or
 * missing fields with their corresponding defaults.
 *
 * - `mapStyle`: accepts `'dark'` only, otherwise defaults to `'light'`
 * - `autoPlay`: accepts boolean, otherwise defaults to `true`
 * - `fadeInDuration`: accepts values in `[0.5, 1.0, 1.5, 2.0, 3.0]`, otherwise defaults to `1.5`
 * - `dynamicEvents`: accepts boolean, otherwise defaults to `true`
 * - `masterVolume`: accepts number in `[0, 1]`, otherwise defaults to `0.8`
 * - `layerVolumes`: each sub-field must be a number in `[0, 1]`
 *
 * @param preferences - The raw value to validate (typically parsed JSON)
 * @returns A fully-populated, valid UserPreferences object
 *
 * Validates: Requirements 11.5, 11.6
 */
export function validatePreferences(preferences: unknown): UserPreferences {
  // If the input is not an object (or is null/array), return full defaults
  if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
    return { ...DEFAULT_PREFERENCES, layerVolumes: { ...DEFAULT_PREFERENCES.layerVolumes } };
  }

  const prefs = preferences as Partial<UserPreferences>;
  const layerVolumes = prefs.layerVolumes as Partial<UserPreferences['layerVolumes']> | undefined;

  return {
    mapStyle: prefs.mapStyle === 'dark' ? 'dark' : 'light',
    autoPlay: typeof prefs.autoPlay === 'boolean' ? prefs.autoPlay : true,
    fadeInDuration: validateFadeInDuration(prefs.fadeInDuration),
    dynamicEvents: typeof prefs.dynamicEvents === 'boolean' ? prefs.dynamicEvents : true,
    masterVolume: validateVolume(prefs.masterVolume, 0.8),
    layerVolumes: {
      ambient: validateVolume(layerVolumes?.ambient, 0.7),
      signature: validateVolume(layerVolumes?.signature, 0.6),
      dialogue: validateVolume(layerVolumes?.dialogue, 0.8),
      secondaryDialogue: validateVolume(layerVolumes?.secondaryDialogue, 0.5),
      atmosphere: validateVolume(layerVolumes?.atmosphere, 0.4),
    },
  };
}

// ---------------------------------------------------------------------------
// PreferencesStore class
// ---------------------------------------------------------------------------

/**
 * Manages loading and saving of UserPreferences to/from localStorage.
 * Handles unavailable localStorage gracefully by falling back to defaults.
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */
export class PreferencesStore {
  /**
   * Checks whether localStorage is available in the current environment.
   * Performs a test set/get/remove cycle to confirm read-write access.
   *
   * @returns `true` if localStorage is accessible, `false` otherwise
   */
  isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__pindrop_ls_test__';
      localStorage.setItem(testKey, testKey);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return retrieved === testKey;
    } catch {
      return false;
    }
  }

  /**
   * Loads user preferences from localStorage.
   * Returns defaults if localStorage is unavailable, the key is absent, or
   * parsing fails.
   *
   * @returns A valid UserPreferences object
   */
  loadPreferences(): UserPreferences {
    if (!this.isLocalStorageAvailable()) {
      console.warn('[PinDrop] localStorage unavailable, using defaults');
      return this.getDefaultPreferences();
    }

    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (!stored) {
        return this.getDefaultPreferences();
      }

      const parsed: unknown = JSON.parse(stored);
      return validatePreferences(parsed);
    } catch (error) {
      console.error('[PinDrop Error] Failed to load preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Persists user preferences to localStorage after validating them.
   * Logs a warning if localStorage is unavailable and an error if the write fails.
   *
   * @param preferences - The preferences object to save
   */
  savePreferences(preferences: UserPreferences): void {
    if (!this.isLocalStorageAvailable()) {
      console.warn('[PinDrop] localStorage unavailable, cannot save preferences');
      return;
    }

    try {
      const validated = validatePreferences(preferences);
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(validated));
    } catch (error) {
      console.error('[PinDrop Error] Failed to save preferences:', error);
    }
  }

  /**
   * Returns a shallow copy of the default preferences object.
   *
   * @returns A fresh copy of DEFAULT_PREFERENCES
   */
  getDefaultPreferences(): UserPreferences {
    return { ...DEFAULT_PREFERENCES, layerVolumes: { ...DEFAULT_PREFERENCES.layerVolumes } };
  }
}

/** Singleton instance of PreferencesStore for application-wide use */
export const preferencesStore = new PreferencesStore();

// ---------------------------------------------------------------------------
// API key storage functions
// ---------------------------------------------------------------------------

/**
 * Stores the ElevenLabs API key in localStorage.
 * The key is never logged to the console.
 *
 * @param apiKey - The API key to store
 *
 * Validates: Requirements 1.5, 3.1, 3.3
 */
export function storeApiKey(apiKey: string): void {
  try {
    localStorage.setItem(API_KEY_KEY, apiKey);
  } catch {
    console.error('[PinDrop Error] Failed to store API key');
  }
}

/**
 * Retrieves the stored ElevenLabs API key from localStorage.
 *
 * @returns The stored API key, or `null` if not found or on error
 *
 * Validates: Requirements 1.5, 3.1, 3.3
 */
export function retrieveApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_KEY);
  } catch {
    return null;
  }
}

/**
 * Removes the stored ElevenLabs API key from localStorage.
 *
 * Validates: Requirements 1.5, 3.1, 3.3
 */
export function clearApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_KEY);
  } catch (error) {
    console.error('[PinDrop Error] Failed to clear API key:', error);
  }
}
