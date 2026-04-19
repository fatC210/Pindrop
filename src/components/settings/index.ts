// Settings 模块统一导出
// 提供所有设置相关组件、工具函数和类型的集中入口

// 主面板组件
export { SettingsPanel } from './SettingsPanel';

// 区域组件
export { ApiKeySection } from './ApiKeySection';
export { MapSection } from './MapSection';
export { PlaybackSection } from './PlaybackSection';
export { CacheSection } from './CacheSection';
export { AboutSection } from './AboutSection';

// 基础 UI 组件
export { Toggle } from './Toggle';
export { ConfirmationDialog } from './ConfirmationDialog';
export { LoadingSpinner } from './LoadingSpinner';

// 工具函数
export { validateApiKeyFormat, maskApiKey, verifyApiKey } from './apiKeyUtils';
export {
  calculateTotalSizeMB,
  formatCacheStats,
  calculateCacheStatistics,
  clearAllCaches,
} from './cacheUtils';
export {
  preferencesStore,
  validatePreferences,
  storeApiKey,
  retrieveApiKey,
  clearApiKey,
  PREFERENCES_KEY,
  API_KEY_KEY,
  DEFAULT_PREFERENCES,
  PreferencesStore,
} from './preferencesStore';

// 枚举导出（值 + 类型）
export { SettingsErrorType } from './types';

// 类型导出
export type {
  FadeInDuration,
  MapTheme,
  SettingsSection,
  LayerVolumes,
  UserPreferences,
  CacheStatistics,
  ApiKeyState,
  ValidationResult,
  VerificationResult,
  CacheClearResult,
  SettingsError,
  SettingsState,
  SettingsActionType,
  SettingsAction,
  SettingsPanelProps,
} from './types';

export type { ApiKeySectionProps } from './ApiKeySection';
export type { MapSectionProps } from './MapSection';
export type { PlaybackSectionProps } from './PlaybackSection';
export type { CacheSectionProps } from './CacheSection';
export type { ToggleProps } from './Toggle';
export type { ConfirmationDialogProps } from './ConfirmationDialog';
export type { LoadingSpinnerProps } from './LoadingSpinner';
