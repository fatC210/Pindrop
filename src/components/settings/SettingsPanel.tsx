'use client';

// 设置面板主组件
// 管理所有设置区域的状态、偏好加载/保存、错误处理和无障碍功能
// Requirements: 10.1-10.6, 11.1-11.4, 12.1-12.7, 14.1-14.4, 15.1-15.4
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import type {
  SettingsPanelProps,
  UserPreferences,
  CacheStatistics,
  VerificationResult,
} from './types';
import { preferencesStore, retrieveApiKey } from './preferencesStore';
import { verifyApiKey } from './apiKeyUtils';
import { calculateCacheStatistics, clearAllCaches } from './cacheUtils';
import { ApiKeySection } from './ApiKeySection';
import { MapSection } from './MapSection';
import { PlaybackSection } from './PlaybackSection';
import { CacheSection } from './CacheSection';
import { AboutSection } from './AboutSection';
import './SettingsPanel.css';

/**
 * 设置面板主组件。
 *
 * 作为所有设置区域的容器，管理偏好加载/保存、API key 验证、
 * 缓存统计和清除、错误/成功反馈，以及完整的无障碍支持。
 *
 * Requirements: 10.1-10.6, 11.1-11.4, 12.1-12.7, 14.1-14.4, 15.1-15.4
 */
export function SettingsPanel({
  isOpen,
  onClose,
  onThemeChange,
  currentTheme,
}: SettingsPanelProps): JSX.Element | null {
  const storageUnavailable =
    typeof window !== 'undefined' && !preferencesStore.isLocalStorageAvailable();

  // ---------------------------------------------------------------------------
  // 状态管理
  // ---------------------------------------------------------------------------

  // API Key 状态
  const [apiKey, setApiKey] = useState<string>(() => retrieveApiKey() ?? '');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // 偏好状态
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') {
      return preferencesStore.getDefaultPreferences();
    }

    return preferencesStore.loadPreferences();
  });

  // 缓存状态
  const [cacheStats, setCacheStats] = useState<CacheStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  // UI 反馈状态
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 关闭动画状态
  const [isClosing, setIsClosing] = useState<boolean>(false);

  // 屏幕阅读器公告
  const [announcement, setAnnouncement] = useState<string>('');

  // Refs
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 节流保存 refs（最多每秒写入 localStorage 一次，保证最终值被保存）
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const pendingPreferencesRef = useRef<UserPreferences | null>(null);

  // ---------------------------------------------------------------------------
  // 辅助函数
  // ---------------------------------------------------------------------------

  function announce(message: string): void {
    // 先清空再设置，确保重复消息也能被读出
    setAnnouncement('');
    window.setTimeout(() => {
      setAnnouncement(message);
    }, 50);
  }

  function savePreferences(updated: UserPreferences): void {
    setPreferences(updated);
    if (storageUnavailable) return;

    const now = Date.now();
    const elapsed = now - lastSaveTimeRef.current;
    const THROTTLE_MS = 1000;

    if (elapsed >= THROTTLE_MS) {
      // 距上次保存已超过 1 秒，立即写入
      preferencesStore.savePreferences(updated);
      lastSaveTimeRef.current = now;
      pendingPreferencesRef.current = null;

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      return;
    }

    // 距上次保存不足 1 秒，记录待保存值并安排尾部调用
    pendingPreferencesRef.current = updated;

    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        if (pendingPreferencesRef.current) {
          preferencesStore.savePreferences(pendingPreferencesRef.current);
          lastSaveTimeRef.current = Date.now();
          pendingPreferencesRef.current = null;
        }
        throttleTimerRef.current = null;
      }, THROTTLE_MS - elapsed);
    }
  }

  async function loadCacheStats(): Promise<void> {
    setIsLoadingStats(true);
    try {
      const stats = await calculateCacheStatistics();
      setCacheStats(stats);
      setErrorMessage(null);
    } catch {
      console.error('[PinDrop Error] CACHE_STATS_LOAD_FAILED: Failed to load cache statistics');
      setCacheStats(null);
      setErrorMessage('Cache statistics unavailable');
    } finally {
      setIsLoadingStats(false);
    }
  }

  function handleClose(): void {
    setIsClosing(true);
    announce('Settings panel closed');

    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
      window.setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 0);
    }, 200);
  }

  function handleOverlayClick(event: ReactMouseEvent<HTMLDivElement>): void {
    // 仅在点击遮罩层时关闭，不在点击面板内容时关闭
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handlePanelClick(event: ReactMouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  function handleApiKeyChange(newKey: string): void {
    setApiKey(newKey);
    setVerificationResult(null);
    setApiKeyError(null);
  }

  async function handleVerifyApiKey(): Promise<void> {
    setIsVerifying(true);
    setVerificationResult(null);
    setApiKeyError(null);

    try {
      const result = await verifyApiKey(apiKey);
      setVerificationResult(result);
      if (!result.isValid && result.error) {
        setApiKeyError(result.error);
      }
    } catch {
      console.error('[PinDrop Error] API_KEY_VERIFICATION_FAILED: Verification request failed');
      setApiKeyError('Verification failed. Check connection.');
    } finally {
      setIsVerifying(false);
    }
  }

  function handleThemeChange(theme: 'light' | 'dark'): void {
    const updated = { ...preferences, mapStyle: theme as UserPreferences['mapStyle'] };
    savePreferences(updated);
    onThemeChange(theme);
  }

  function handleAutoPlayChange(enabled: boolean): void {
    const updated = { ...preferences, autoPlay: enabled };
    savePreferences(updated);
  }

  function handleFadeInChange(duration: number): void {
    const updated = {
      ...preferences,
      fadeInDuration: duration as UserPreferences['fadeInDuration'],
    };
    savePreferences(updated);
  }

  function handleDynamicEventsChange(enabled: boolean): void {
    const updated = { ...preferences, dynamicEvents: enabled };
    savePreferences(updated);
  }

  async function handleClearCache(): Promise<void> {
    setIsClearingCache(true);
    setErrorMessage(null);

    try {
      await clearAllCaches();
      setSuccessMessage('Cache cleared successfully');
      announce('Cache cleared successfully');
      await loadCacheStats();
    } catch {
      console.error('[PinDrop Error] CACHE_CLEAR_FAILED: Failed to clear cache');
      setErrorMessage('Failed to clear cache');
      announce('Failed to clear cache');
    } finally {
      setIsClearingCache(false);
    }
  }

  const announceFromEffect = useEffectEvent((message: string) => {
    announce(message);
  });

  const closeFromEffect = useEffectEvent(() => {
    handleClose();
  });

  // ---------------------------------------------------------------------------
  // 生命周期效果
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return (): void => {
      // 卸载时如果有待保存的偏好，立即写入
      if (pendingPreferencesRef.current && !storageUnavailable) {
        preferencesStore.savePreferences(pendingPreferencesRef.current);
        pendingPreferencesRef.current = null;
      }
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [storageUnavailable]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const statsTimer = window.setTimeout(() => {
      void loadCacheStats();
    }, 0);

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const announcementTimer = window.setTimeout(() => {
      announceFromEffect('Settings panel opened');
    }, 0);

    return (): void => {
      window.clearTimeout(statsTimer);
      window.clearTimeout(focusTimer);
      window.clearTimeout(announcementTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    successTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return (): void => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [successMessage]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeFromEffect();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const panel = panelRef.current;
      if (!panel) return;

      const focusableElements = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

  const visibleTheme = storageUnavailable ? currentTheme : preferences.mapStyle;

  // 面板关闭且无关闭动画时不渲染
  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      className={`settings-overlay${isClosing ? ' settings-overlay--closing' : ''}`}
      onClick={handleOverlayClick}
      role="presentation"
    >
      {/* 屏幕阅读器公告区域 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div
        ref={panelRef}
        className={`settings-panel${isClosing ? ' settings-panel--closing' : ''}`}
        onClick={handlePanelClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
      >
        {/* 面板头部 */}
        <div className="settings-panel__header">
          <h2 id="settings-panel-title" className="settings-panel__title">
            Settings
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-panel__close-button"
            onClick={handleClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* 可滚动内容区域 */}
        <div className="settings-panel__content">
          {/* 存储不可用警告 */}
          {storageUnavailable && (
            <div className="settings-panel__storage-warning" role="alert">
              <span className="settings-panel__storage-warning-icon" aria-hidden="true">
                ⚠️
              </span>
              <span>Settings cannot be saved</span>
            </div>
          )}

          {/* 成功消息 */}
          {successMessage && (
            <div className="settings-panel__message settings-panel__message--success" aria-live="polite">
              {successMessage}
            </div>
          )}

          {/* 错误消息 */}
          {errorMessage && (
            <div className="settings-panel__message settings-panel__message--error" role="alert">
              {errorMessage}
            </div>
          )}

          {/* API Key 区域 */}
          <div className="settings-panel__section">
            <ApiKeySection
              apiKey={apiKey}
              onApiKeyChange={handleApiKeyChange}
              onVerify={handleVerifyApiKey}
              isVerifying={isVerifying}
              verificationResult={verificationResult}
              error={apiKeyError}
            />
          </div>

          {/* 地图区域 */}
          <div className="settings-panel__section">
            <MapSection theme={visibleTheme} onThemeChange={handleThemeChange} />
          </div>

          {/* 播放区域 */}
          <div className="settings-panel__section">
            <PlaybackSection
              autoPlay={preferences.autoPlay}
              fadeInDuration={preferences.fadeInDuration}
              dynamicEvents={preferences.dynamicEvents}
              onAutoPlayChange={handleAutoPlayChange}
              onFadeInChange={handleFadeInChange}
              onDynamicEventsChange={handleDynamicEventsChange}
            />
          </div>

          {/* 缓存区域 */}
          <div className="settings-panel__section">
            <CacheSection
              stats={cacheStats}
              isLoading={isLoadingStats}
              onClearCache={handleClearCache}
              isClearingCache={isClearingCache}
            />
          </div>

          {/* 关于区域 */}
          <div className="settings-panel__section">
            <AboutSection />
          </div>
        </div>
      </div>
    </div>
  );
}
