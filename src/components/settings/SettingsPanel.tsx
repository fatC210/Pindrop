'use client';

// 设置面板主组件
// 管理所有设置区域的状态、偏好加载/保存、错误处理和无障碍功能
// Requirements: 10.1-10.6, 11.1-11.4, 12.1-12.7, 14.1-14.4, 15.1-15.4
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import type { SettingsPanelProps, UserPreferences, CacheStatistics, VerificationResult } from './types';
import { preferencesStore } from './preferencesStore';
import { retrieveApiKey } from './preferencesStore';
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
}: SettingsPanelProps): React.JSX.Element | null {
  // ---------------------------------------------------------------------------
  // 状态管理
  // ---------------------------------------------------------------------------

  // API Key 状态
  const [apiKey, setApiKey] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // 偏好状态
  const [preferences, setPreferences] = useState<UserPreferences>(
    preferencesStore.getDefaultPreferences,
  );

  // 缓存状态
  const [cacheStats, setCacheStats] = useState<CacheStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  // UI 反馈状态
  const [storageUnavailable, setStorageUnavailable] = useState<boolean>(false);
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
  // 屏幕阅读器公告辅助函数
  // ---------------------------------------------------------------------------

  const announce = useCallback((message: string): void => {
    // 先清空再设置，确保重复消息也能被读出
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
    }, 50);
  }, []);

  // ---------------------------------------------------------------------------
  // 节流定时器清理（组件卸载时）
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

  // ---------------------------------------------------------------------------
  // 偏好加载（面板打开时）
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

    // 重置关闭动画状态
    setIsClosing(false);

    // 记录打开面板前的焦点元素，用于关闭时恢复
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // 检查 localStorage 可用性
    const isAvailable = preferencesStore.isLocalStorageAvailable();
    setStorageUnavailable(!isAvailable);

    // 加载偏好
    const loaded = preferencesStore.loadPreferences();
    setPreferences(loaded);

    // 加载 API key
    const storedKey = retrieveApiKey();
    if (storedKey) {
      setApiKey(storedKey);
    }

    // 加载缓存统计
    void loadCacheStats();

    // 打开时聚焦关闭按钮
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    // 公告面板已打开
    announce('Settings panel opened');
  }, [isOpen, announce]);

  // ---------------------------------------------------------------------------
  // 成功消息自动消失（3 秒）
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (successMessage) {
      // 清除之前的定时器
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }

    return (): void => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // 键盘导航：Escape 关闭 + 焦点陷阱
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Escape 关闭面板
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      // 焦点陷阱：Tab 键在面板内循环
      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;

        const focusableElements = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift+Tab：从第一个元素跳到最后一个
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab：从最后一个元素跳到第一个
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // 关闭处理（带动画 + 恢复焦点）
  // ---------------------------------------------------------------------------

  const handleClose = useCallback((): void => {
    // 触发关闭动画
    setIsClosing(true);

    // 公告面板即将关闭
    announce('Settings panel closed');

    // 等待动画完成后真正关闭
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      // 恢复焦点到触发按钮
      setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 0);
    }, 200);
  }, [onClose, announce]);

  // ---------------------------------------------------------------------------
  // 遮罩层点击关闭
  // ---------------------------------------------------------------------------

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      // 仅在点击遮罩层时关闭，不在点击面板内容时关闭
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // 阻止面板内点击事件冒泡到遮罩层
  const handlePanelClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      event.stopPropagation();
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // 偏好保存辅助函数（节流：最多每秒写入 localStorage 一次，保证最终值被保存）
  // ---------------------------------------------------------------------------

  const savePreferences = useCallback(
    (updated: UserPreferences): void => {
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

        // 清除可能存在的待执行定时器
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
      } else {
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
    },
    [storageUnavailable],
  );

  // ---------------------------------------------------------------------------
  // API Key 处理
  // ---------------------------------------------------------------------------

  const handleApiKeyChange = useCallback((newKey: string): void => {
    setApiKey(newKey);
    // 清除之前的验证结果
    setVerificationResult(null);
    setApiKeyError(null);
  }, []);

  const handleVerifyApiKey = useCallback(async (): Promise<void> => {
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
  }, [apiKey]);

  // ---------------------------------------------------------------------------
  // 主题切换
  // ---------------------------------------------------------------------------

  const handleThemeChange = useCallback(
    (theme: 'light' | 'dark'): void => {
      const updated = { ...preferences, mapStyle: theme as UserPreferences['mapStyle'] };
      savePreferences(updated);
      onThemeChange(theme);
    },
    [preferences, savePreferences, onThemeChange],
  );

  // ---------------------------------------------------------------------------
  // 播放偏好处理
  // ---------------------------------------------------------------------------

  const handleAutoPlayChange = useCallback(
    (enabled: boolean): void => {
      const updated = { ...preferences, autoPlay: enabled };
      savePreferences(updated);
    },
    [preferences, savePreferences],
  );

  const handleFadeInChange = useCallback(
    (duration: number): void => {
      const updated = { ...preferences, fadeInDuration: duration as UserPreferences['fadeInDuration'] };
      savePreferences(updated);
    },
    [preferences, savePreferences],
  );

  const handleDynamicEventsChange = useCallback(
    (enabled: boolean): void => {
      const updated = { ...preferences, dynamicEvents: enabled };
      savePreferences(updated);
    },
    [preferences, savePreferences],
  );

  // ---------------------------------------------------------------------------
  // 缓存统计加载
  // ---------------------------------------------------------------------------

  const loadCacheStats = useCallback(async (): Promise<void> => {
    setIsLoadingStats(true);
    try {
      const stats = await calculateCacheStatistics();
      setCacheStats(stats);
    } catch {
      console.error('[PinDrop Error] CACHE_STATS_LOAD_FAILED: Failed to load cache statistics');
      setCacheStats(null);
      setErrorMessage('Cache statistics unavailable');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 缓存清除
  // ---------------------------------------------------------------------------

  const handleClearCache = useCallback(async (): Promise<void> => {
    setIsClearingCache(true);
    setErrorMessage(null);

    try {
      await clearAllCaches();
      setSuccessMessage('Cache cleared successfully');
      announce('Cache cleared successfully');
      // 刷新统计
      await loadCacheStats();
    } catch {
      console.error('[PinDrop Error] CACHE_CLEAR_FAILED: Failed to clear cache');
      setErrorMessage('Failed to clear cache');
      announce('Failed to clear cache');
    } finally {
      setIsClearingCache(false);
    }
  }, [loadCacheStats, announce]);

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------

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
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
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
            <div
              className="settings-panel__storage-warning"
              role="alert"
            >
              <span className="settings-panel__storage-warning-icon" aria-hidden="true">⚠️</span>
              <span>Settings cannot be saved</span>
            </div>
          )}

          {/* 成功消息 */}
          {successMessage && (
            <div
              className="settings-panel__message settings-panel__message--success"
              aria-live="polite"
            >
              {successMessage}
            </div>
          )}

          {/* 错误消息 */}
          {errorMessage && (
            <div
              className="settings-panel__message settings-panel__message--error"
              role="alert"
            >
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
            <MapSection
              theme={preferences.mapStyle}
              onThemeChange={handleThemeChange}
            />
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
