'use client';

// 播放偏好设置区域组件
// 管理动态事件偏好
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.4, 7.5
import React from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import { Toggle } from './Toggle';
import './PlaybackSection.css';

export interface PlaybackSectionProps {
  dynamicEvents: boolean;
  onDynamicEventsChange: (enabled: boolean) => void;
}

/** 播放偏好设置区域：动态事件 */
export function PlaybackSection({
  dynamicEvents,
  onDynamicEventsChange,
}: PlaybackSectionProps): React.JSX.Element {
  const { messages } = useI18n();

  return (
    <section className="playback-section" aria-labelledby="playback-section-header">
      <h3 id="playback-section-header" className="playback-section__header">
        {messages.settings.sections.playback.header}
      </h3>

      {/* 动态事件开关 */}
      <div className="playback-section__setting-item">
        <label className="playback-section__label" htmlFor="dynamic-events-toggle">
          {messages.settings.sections.playback.dynamicEvents}
          <span className="playback-section__description">
            {messages.settings.sections.playback.dynamicEventsDescription}
          </span>
        </label>
        <Toggle
          id="dynamic-events-toggle"
          checked={dynamicEvents}
          onChange={onDynamicEventsChange}
        />
      </div>
    </section>
  );
}
