'use client';

/**
 * 播放偏好 hook。
 *
 * 从 PreferencesStore 读取播放相关偏好（autoPlay、fadeInDuration、dynamicEvents），
 * 并监听 localStorage 变化以保持同步。
 *
 * 供音频播放器组件使用，在音频播放器实现后可直接消费此 hook。
 *
 * @module usePlaybackPreferences
 *
 * Requirements: 5.2, 5.4, 6.2, 6.4, 7.2, 7.4
 */

import { useState, useEffect, useCallback } from 'react';

import type { FadeInDuration } from '@/components/settings/types';
import {
  preferencesStore,
  PREFERENCES_KEY,
  PREFERENCES_UPDATED_EVENT,
} from '@/components/settings/preferencesStore';

/** usePlaybackPreferences 返回的播放偏好对象 */
export interface PlaybackPreferences {
  /** 是否在点击后自动播放 */
  autoPlay: boolean;
  /** 淡入时长（秒） */
  fadeInDuration: FadeInDuration;
  /** 是否启用动态环境音效事件 */
  dynamicEvents: boolean;
}

/**
 * 从 PreferencesStore 读取播放偏好并监听变化。
 *
 * - 挂载时从 localStorage 加载当前偏好
 * - 监听 `storage` 事件以响应其他标签页的偏好变更
 * - 提供 `refresh` 方法供手动刷新
 *
 * @returns 当前播放偏好和刷新函数
 *
 * @example
 * ```tsx
 * const { autoPlay, fadeInDuration, dynamicEvents } = usePlaybackPreferences();
 * ```
 */
export function usePlaybackPreferences(): PlaybackPreferences & { refresh: () => void } {
  const [preferences, setPreferences] = useState<PlaybackPreferences>(() => {
    const prefs = preferencesStore.loadPreferences();
    return {
      autoPlay: prefs.autoPlay,
      fadeInDuration: prefs.fadeInDuration,
      dynamicEvents: prefs.dynamicEvents,
    };
  });

  // 从 localStorage 重新加载偏好
  const refresh = useCallback((): void => {
    const prefs = preferencesStore.loadPreferences();
    setPreferences({
      autoPlay: prefs.autoPlay,
      fadeInDuration: prefs.fadeInDuration,
      dynamicEvents: prefs.dynamicEvents,
    });
  }, []);

  // 监听 storage 事件（其他标签页修改偏好时触发）
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent): void => {
      if (event.key === PREFERENCES_KEY) {
        refresh();
      }
    };

    const handlePreferencesUpdate = (): void => {
      refresh();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate);
    return (): void => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate);
    };
  }, [refresh]);

  return {
    ...preferences,
    refresh,
  };
}
