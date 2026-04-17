// Type definitions for the Settings UI module
// Requirements: 11.2, 11.5

// ---------------------------------------------------------------------------
// Primitive / union types
// ---------------------------------------------------------------------------

/** Valid fade-in duration options in seconds */
export type FadeInDuration = 0.5 | 1.0 | 1.5 | 2.0 | 3.0;

/** Map visual theme */
export type MapTheme = 'light' | 'dark';

/** Navigable sections within the settings panel */
export type SettingsSection = 'api-key' | 'map' | 'playback' | 'cache' | 'about';

// ---------------------------------------------------------------------------
// Data-model interfaces
// ---------------------------------------------------------------------------

/** Per-layer volume levels (each value 0–1) */
export interface LayerVolumes {
  ambient: number;
  signature: number;
  dialogue: number;
  secondaryDialogue: number;
  atmosphere: number;
}

/**
 * Complete set of user-configurable preferences.
 * Persisted as a single JSON object under `pindrop_preferences` in localStorage.
 */
export interface UserPreferences {
  mapStyle: MapTheme;
  autoPlay: boolean;
  fadeInDuration: FadeInDuration;
  dynamicEvents: boolean;
  /** Master volume level (0–1) */
  masterVolume: number;
  layerVolumes: LayerVolumes;
}

/** Aggregated cache usage statistics read from IndexedDB */
export interface CacheStatistics {
  soundscapeCount: number;
  totalSizeMB: number;
  geocodeCount: number;
  historyCount: number;
}

// ---------------------------------------------------------------------------
// API key types
// ---------------------------------------------------------------------------

/** Runtime state for the API key input / verification flow */
export interface ApiKeyState {
  value: string;
  masked: string;
  isValid: boolean | null;
  error: string | null;
  isVerifying: boolean;
}

/** Result of synchronous format validation */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/** Result of asynchronous API key verification against ElevenLabs */
export interface VerificationResult {
  isValid: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Cache types
// ---------------------------------------------------------------------------

/** Outcome of a cache-clearing operation */
export interface CacheClearResult {
  success: boolean;
  error?: string;
  clearedStores: string[];
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/** Exhaustive set of error categories the settings module can produce */
export enum SettingsErrorType {
  INVALID_API_KEY_FORMAT = 'INVALID_API_KEY_FORMAT',
  API_KEY_VERIFICATION_FAILED = 'API_KEY_VERIFICATION_FAILED',
  LOCALSTORAGE_UNAVAILABLE = 'LOCALSTORAGE_UNAVAILABLE',
  LOCALSTORAGE_WRITE_FAILED = 'LOCALSTORAGE_WRITE_FAILED',
  INDEXEDDB_UNAVAILABLE = 'INDEXEDDB_UNAVAILABLE',
  CACHE_STATS_LOAD_FAILED = 'CACHE_STATS_LOAD_FAILED',
  CACHE_CLEAR_FAILED = 'CACHE_CLEAR_FAILED',
  PREFERENCES_LOAD_FAILED = 'PREFERENCES_LOAD_FAILED',
  PREFERENCES_SAVE_FAILED = 'PREFERENCES_SAVE_FAILED',
}

/** Structured error produced by the settings module */
export interface SettingsError {
  type: SettingsErrorType;
  message: string;
  timestamp: number;
  recoverable: boolean;
}

// ---------------------------------------------------------------------------
// Component state & actions
// ---------------------------------------------------------------------------

/** Full state shape for the settings panel */
export interface SettingsState {
  // Panel
  isOpen: boolean;
  activeSection: SettingsSection | null;

  // API Key
  apiKey: ApiKeyState;

  // Preferences
  preferences: UserPreferences;
  hasUnsavedChanges: boolean;

  // Cache
  cacheStats: CacheStatistics | null;
  isLoadingStats: boolean;
  isClearingCache: boolean;
  showClearConfirmation: boolean;

  // UI feedback
  error: string | null;
  successMessage: string | null;
}

/** Action types dispatched by the settings reducer */
export type SettingsActionType =
  | 'OPEN_PANEL'
  | 'CLOSE_PANEL'
  | 'SET_API_KEY'
  | 'VERIFY_API_KEY_START'
  | 'VERIFY_API_KEY_SUCCESS'
  | 'VERIFY_API_KEY_ERROR'
  | 'UPDATE_PREFERENCE'
  | 'LOAD_CACHE_STATS_START'
  | 'LOAD_CACHE_STATS_SUCCESS'
  | 'LOAD_CACHE_STATS_ERROR'
  | 'CLEAR_CACHE_START'
  | 'CLEAR_CACHE_SUCCESS'
  | 'CLEAR_CACHE_ERROR'
  | 'SHOW_ERROR'
  | 'SHOW_SUCCESS'
  | 'CLEAR_MESSAGES';

/** A reducer-style action for settings state transitions */
export interface SettingsAction {
  type: SettingsActionType;
  payload?: unknown;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

/** Props for the top-level SettingsPanel component */
export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (theme: MapTheme) => void;
  currentTheme: MapTheme;
}
