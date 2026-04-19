'use client';

// 播放偏好设置区域组件
// 管理自动播放、淡入时长和动态事件偏好
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.4, 7.5
import React, { useCallback } from 'react';

import { Toggle } from './Toggle';
import './PlaybackSection.css';

export interface PlaybackSectionProps {
  autoPlay: boolean;
  fadeInDuration: number;
  dynamicEvents: boolean;
  onAutoPlayChange: (enabled: boolean) => void;
  onFadeInChange: (duration: number) => void;
  onDynamicEventsChange: (enabled: boolean) => void;
}

/** 淡入时长选项 */
const FADE_IN_OPTIONS = [
  { value: 0.5, label: '0.5s' },
  { value: 1.0, label: '1.0s' },
  { value: 1.5, label: '1.5s' },
  { value: 2.0, label: '2.0s' },
  { value: 3.0, label: '3.0s' },
];

/** 播放偏好设置区域：自动播放、淡入时长、动态事件 */
export function PlaybackSection({
  autoPlay,
  fadeInDuration,
  dynamicEvents,
  onAutoPlayChange,
  onFadeInChange,
  onDynamicEventsChange,
}: PlaybackSectionProps): React.JSX.Element {
  const handleFadeInChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      onFadeInChange(Number(event.target.value));
    },
    [onFadeInChange],
  );

  return (
    <section className="playback-section" aria-labelledby="playback-section-header">
      <h3 id="playback-section-header" className="playback-section__header">
        Playback
      </h3>

      {/* 自动播放开关 */}
      <div className="playback-section__setting-item">
        <label className="playback-section__label" htmlFor="auto-play-toggle">
          Auto-play
          <span className="playback-section__description">
            Play immediately after click
          </span>
        </label>
        <Toggle
          id="auto-play-toggle"
          checked={autoPlay}
          onChange={onAutoPlayChange}
        />
      </div>

      {/* 淡入时长选择 */}
      <div className="playback-section__setting-item">
        <label className="playback-section__label" htmlFor="fade-in-selector">
          Fade-in duration
        </label>
        <select
          id="fade-in-selector"
          className="playback-section__select"
          value={fadeInDuration}
          onChange={handleFadeInChange}
        >
          {FADE_IN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 动态事件开关 */}
      <div className="playback-section__setting-item">
        <label className="playback-section__label" htmlFor="dynamic-events-toggle">
          Dynamic events
          <span className="playback-section__description">
            Random ambient sound effects
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
