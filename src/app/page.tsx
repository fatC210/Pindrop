'use client';

// PinDrop 主页面
// 集成地图组件、设置面板和设置按钮
// Requirements: 10.1, 4.3, 4.4, 4.5

import { useState, useCallback, useRef } from 'react';

import dynamic from 'next/dynamic';

import type { MapTheme } from '@/components/settings/types';
import { SettingsPanel } from '@/components/settings';
import { preferencesStore } from '@/components/settings/preferencesStore';

// 动态导入 MapView 以避免 SSR 问题（Leaflet 需要 window 对象）
const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => ({ default: mod.MapView })),
  { ssr: false },
);

/**
 * 应用主页面。
 *
 * 渲染全屏地图、右上角设置按钮和设置面板覆盖层。
 * 管理设置面板的打开/关闭状态和地图主题状态。
 */
export default function Home(): React.JSX.Element {
  // 设置面板打开/关闭状态
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 地图主题状态，从 localStorage 加载
  const [currentTheme, setCurrentTheme] = useState<MapTheme>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return preferencesStore.loadPreferences().mapStyle;
  });

  // 地图加载状态
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 设置按钮 ref，用于关闭面板后恢复焦点
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // 打开设置面板
  const handleOpenSettings = useCallback((): void => {
    setIsSettingsOpen(true);
  }, []);

  // 关闭设置面板
  const handleCloseSettings = useCallback((): void => {
    setIsSettingsOpen(false);
    // 恢复焦点到设置按钮
    setTimeout(() => {
      settingsButtonRef.current?.focus();
    }, 0);
  }, []);

  // 主题切换回调，传递给 SettingsPanel
  // SettingsPanel 内部已处理 localStorage 持久化
  const handleThemeChange = useCallback((theme: MapTheme): void => {
    setCurrentTheme(theme);
  }, []);

  // 地图坐标选择回调（暂时仅记录日志，后续集成音景生成）
  const handleCoordinateSelect = useCallback((lat: number, lng: number): void => {
    setIsLoading(true);
    // TODO: 集成音景生成流程
    console.log(`[PinDrop] 坐标选择: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    // 模拟加载完成
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="app-container">
      {/* 全屏地图 */}
      <MapView
        onCoordinateSelect={handleCoordinateSelect}
        theme={currentTheme}
        isLoading={isLoading}
      />

      {/* 设置按钮 - 右上角固定定位 */}
      <button
        ref={settingsButtonRef}
        type="button"
        className="settings-trigger-button"
        onClick={handleOpenSettings}
        aria-label="Open settings"
        title="Settings"
      >
        ⚙️
      </button>

      {/* 设置面板覆盖层 */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        onThemeChange={handleThemeChange}
        currentTheme={currentTheme}
      />
    </div>
  );
}
