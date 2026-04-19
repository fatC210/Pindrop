'use client';

// 地图主题选择区域组件
// 提供 Light/Dark 主题切换
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
import React, { useCallback } from 'react';

import type { MapTheme } from './types';
import './MapSection.css';

export interface MapSectionProps {
  theme: MapTheme;
  onThemeChange: (theme: MapTheme) => void;
}

/** 主题选项配置 */
interface ThemeOption {
  value: MapTheme;
  label: string;
  icon: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
];

/** 地图主题选择区域：Light/Dark 主题切换 */
export function MapSection({ theme, onThemeChange }: MapSectionProps): React.JSX.Element {
  const handleThemeSelect = useCallback(
    (selectedTheme: MapTheme): void => {
      onThemeChange(selectedTheme);
    },
    [onThemeChange],
  );

  return (
    <section className="map-section" aria-labelledby="map-section-header">
      <h3 id="map-section-header" className="map-section__header">
        Map
      </h3>

      <div className="map-section__setting-item">
        <span className="map-section__label" id="theme-selector-label">
          Theme
        </span>
        <div
          className="map-section__theme-selector"
          role="group"
          aria-labelledby="theme-selector-label"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`map-section__theme-option${
                theme === option.value ? ' map-section__theme-option--active' : ''
              }`}
              onClick={() => handleThemeSelect(option.value)}
              aria-pressed={theme === option.value}
            >
              <span className="map-section__theme-icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="map-section__theme-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
