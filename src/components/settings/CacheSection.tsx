'use client';

// 缓存管理区域组件
// 显示缓存统计信息并提供清除缓存功能
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
import React, { useState, useCallback } from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import type { CacheStatistics } from './types';
import { formatCacheStats } from './cacheUtils';
import { ConfirmationDialog } from './ConfirmationDialog';
import { LoadingSpinner } from './LoadingSpinner';
import './CacheSection.css';

export interface CacheSectionProps {
  stats: CacheStatistics | null;
  isLoading: boolean;
  onClearCache: () => void;
  isClearingCache: boolean;
}

/** 缓存管理区域：统计信息显示和缓存清除 */
export function CacheSection({
  stats,
  isLoading,
  onClearCache,
  isClearingCache,
}: CacheSectionProps): React.JSX.Element {
  const { messages } = useI18n();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  const handleClearClick = useCallback((): void => {
    setShowConfirmation(true);
  }, []);

  const handleConfirm = useCallback((): void => {
    setShowConfirmation(false);
    onClearCache();
  }, [onClearCache]);

  const handleCancel = useCallback((): void => {
    setShowConfirmation(false);
  }, []);

  // 缓存为空或不可用时禁用清除按钮
  const isClearDisabled = isClearingCache || !stats || stats.soundscapeCount === 0;

  return (
    <section className="cache-section" aria-labelledby="cache-section-header">
      <h3 id="cache-section-header" className="cache-section__header">
        {messages.settings.sections.cache.header}
      </h3>

      {/* 缓存统计信息 */}
      <div className="cache-section__stats" aria-live="polite">
        {isLoading ? (
          <span className="cache-section__stats-loading">
            <LoadingSpinner size="small" />
            {messages.settings.sections.cache.loading}
          </span>
        ) : stats ? (
          <span className="cache-section__stats-text">
            {formatCacheStats(stats, {
              unavailable: messages.settings.sections.cache.unavailable,
              formatSummary: messages.settings.sections.cache.formatStats,
            })}
          </span>
        ) : (
          <span className="cache-section__stats-error">
            {messages.settings.sections.cache.unavailable}
          </span>
        )}
      </div>

      {/* 清除缓存按钮 */}
      <button
        type="button"
        className="cache-section__clear-button"
        onClick={handleClearClick}
        disabled={isClearDisabled}
        aria-label={messages.settings.sections.cache.clearAll}
      >
        {isClearingCache
          ? messages.settings.sections.cache.clearing
          : messages.settings.sections.cache.clearAll}
      </button>

      {/* 确认对话框 */}
      {showConfirmation && (
        <ConfirmationDialog
          title={messages.settings.sections.cache.confirmTitle}
          message={messages.settings.sections.cache.confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </section>
  );
}
