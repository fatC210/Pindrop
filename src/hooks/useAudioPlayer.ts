'use client';

/**
 * 音频播放器 React Hook
 *
 * 封装 AudioPlayer 实例，提供 React 组件友好的播放控制接口。
 * 内部通过 useRef 持有 AudioPlayer 单例，组件卸载时自动销毁。
 * 通过 subscribe() 将 PlaybackStateInfo 同步到 React state。
 *
 * 功能：
 * - 创建并管理 AudioPlayer 实例生命周期
 * - 暴露 play/pause/resume/stop 等播放控制方法
 * - 暴露 setMasterVolume/setLayerVolume/setLayerPan 音量控制方法
 * - 提供 enableAudio() 处理浏览器 autoplay 策略
 * - 初始化时从 localStorage 加载音量偏好（AudioPlayer 构造函数内部处理）
 *
 * 需求覆盖: 19.3, 19.5, 21.1-21.10
 *
 * @module useAudioPlayer
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import type { SoundscapeRecipe } from '@/types/soundscapeRecipe';
import type {
  AudioBlobMap,
  LayerType,
  PlaybackStateInfo,
} from '@/utils/audio/types';
import { AudioPlayer } from '@/utils/audio';
import type { AudioGeneratorFn } from '@/utils/audio';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/** 播放状态初始值 */
const INITIAL_STATE: PlaybackStateInfo = {
  state: 'idle',
  soundscapeId: null,
  loadedLayers: [],
  failedLayers: [],
  errorMessage: null,
};

/** useAudioPlayer hook 返回值类型 */
export interface UseAudioPlayerReturn {
  /** 当前播放状态 */
  playbackState: PlaybackStateInfo;
  /** 播放声景 */
  play: (recipe: SoundscapeRecipe, blobs: AudioBlobMap) => Promise<void>;
  /** 暂停播放 */
  pause: () => void;
  /** 恢复播放 */
  resume: () => void;
  /** 停止播放 */
  stop: () => void;
  /** 设置总音量 (0-1) */
  setMasterVolume: (volume: number) => void;
  /** 设置指定层音量 (0-1) */
  setLayerVolume: (layerType: LayerType, volume: number) => void;
  /** 设置对话层声像位置 (-1 到 1) */
  setLayerPan: (layerType: 'dialogue' | 'secondaryDialogue', pan: number) => void;
  /** 启用音频（处理浏览器 autoplay 策略） */
  enableAudio: () => Promise<void>;
  /** 浏览器是否支持 Web Audio API */
  isSupported: boolean;
}

/**
 * 检测浏览器是否支持 Web Audio API
 *
 * 在客户端检查 window.AudioContext 或 webkitAudioContext 是否存在。
 */
function checkWebAudioSupport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!(
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/**
 * 音频播放器 React Hook
 *
 * 创建并管理 AudioPlayer 实例，将播放状态同步到 React state，
 * 组件卸载时自动清理资源。
 *
 * AudioPlayer 构造函数内部会从 localStorage 加载音量偏好（masterVolume、layerVolumes），
 * 无需在 hook 层面额外处理。
 *
 * @param audioGeneratorFn - 可选的音频生成函数，用于动态事件
 * @returns 播放控制方法和当前状态
 *
 * @example
 * ```tsx
 * const { playbackState, play, pause, resume, stop, enableAudio } = useAudioPlayer();
 *
 * // 处理 autoplay 策略
 * <button onClick={enableAudio}>启用音频</button>
 *
 * // 播放声景
 * await play(recipe, blobs);
 * ```
 */
export function useAudioPlayer(
  audioGeneratorFn?: AudioGeneratorFn
): UseAudioPlayerReturn {
  // 播放状态（通过 subscribe 同步）
  const [playbackState, setPlaybackState] = useState<PlaybackStateInfo>(INITIAL_STATE);

  // 浏览器是否支持 Web Audio API
  const [isSupported] = useState<boolean>(checkWebAudioSupport);

  // AudioPlayer 实例（useRef 保持跨渲染稳定）
  const playerRef = useRef<AudioPlayer | null>(null);

  // 标记组件是否已卸载，防止卸载后更新 state
  const isMountedRef = useRef<boolean>(true);

  // 保存取消订阅函数，用于清理
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * 懒初始化 AudioPlayer 实例
   *
   * 首次调用时创建实例并订阅状态变更，后续调用返回已有实例。
   * AudioPlayer 构造函数内部会从 localStorage 加载音量偏好。
   */
  const getPlayer = useCallback((): AudioPlayer | null => {
    if (playerRef.current) {
      return playerRef.current;
    }

    try {
      const player = new AudioPlayer(audioGeneratorFn);

      // 订阅状态变更，同步到 React state
      const unsubscribe = player.subscribe((state: PlaybackStateInfo) => {
        if (isMountedRef.current) {
          setPlaybackState(state);
        }
      });
      unsubscribeRef.current = unsubscribe;

      playerRef.current = player;
      console.log(`${LOG_PREFIX} useAudioPlayer: AudioPlayer 实例已创建`);
      return player;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} useAudioPlayer: AudioPlayer 创建失败: ${message}`);
      return null;
    }
  }, [audioGeneratorFn]);

  useEffect(() => {
    if (!isSupported) {
      console.warn(`${LOG_PREFIX} useAudioPlayer: 浏览器不支持 Web Audio API`);
    }
  }, [isSupported]);

  // 组件卸载时销毁 AudioPlayer
  useEffect(() => {
    isMountedRef.current = true;

    return (): void => {
      isMountedRef.current = false;

      // 取消状态订阅
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // 销毁 AudioPlayer 实例
      if (playerRef.current) {
        console.log(`${LOG_PREFIX} useAudioPlayer: 组件卸载，销毁 AudioPlayer`);
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // === 播放控制方法 ===

  const play = useCallback(
    async (recipe: SoundscapeRecipe, blobs: AudioBlobMap): Promise<void> => {
      const player = getPlayer();
      if (!player) {
        console.error(`${LOG_PREFIX} useAudioPlayer: 无法播放，AudioPlayer 未初始化`);
        return;
      }
      await player.play(recipe, blobs);
    },
    [getPlayer]
  );

  const pause = useCallback((): void => {
    const player = playerRef.current;
    if (player) {
      player.pause();
    }
  }, []);

  const resume = useCallback((): void => {
    const player = playerRef.current;
    if (player) {
      player.resume();
    }
  }, []);

  const stop = useCallback((): void => {
    const player = playerRef.current;
    if (player) {
      player.stop();
    }
  }, []);

  const setMasterVolume = useCallback((volume: number): void => {
    const player = playerRef.current;
    if (player) {
      player.setMasterVolume(volume);
    }
  }, []);

  const setLayerVolume = useCallback((layerType: LayerType, volume: number): void => {
    const player = playerRef.current;
    if (player) {
      player.setLayerVolume(layerType, volume);
    }
  }, []);

  const setLayerPan = useCallback(
    (layerType: 'dialogue' | 'secondaryDialogue', pan: number): void => {
      const player = playerRef.current;
      if (player) {
        player.setLayerPan(layerType, pan);
      }
    },
    []
  );

  /**
   * 启用音频 — 处理浏览器 autoplay 策略
   *
   * 浏览器（尤其是 Safari）要求用户交互后才能播放音频。
   * 此方法应在用户点击等交互事件中调用，以确保 AudioContext 可以正常运行。
   *
   * 工作原理：
   * 1. 确保 AudioPlayer 实例已创建（懒初始化）
   * 2. 创建并立即恢复一个 AudioContext，满足浏览器的用户交互要求
   * 3. 后续 AudioPlayer.play() 调用时，其内部 AudioContext 也能正常恢复
   *
   * 注意：Chrome 在任意 AudioContext 被用户交互恢复后，后续新建的 AudioContext
   * 也会自动处于 running 状态。Safari 更严格，但 play() 内部也会调用 resume()。
   */
  const enableAudio = useCallback(async (): Promise<void> => {
    // 确保 AudioPlayer 实例已创建
    const player = getPlayer();
    if (!player) {
      console.warn(`${LOG_PREFIX} useAudioPlayer: 无法启用音频，AudioPlayer 未初始化`);
      return;
    }

    try {
      // 创建一个临时 AudioContext 并在用户交互中恢复它
      // 这满足浏览器的 autoplay 策略要求
      // AudioPlayer.play() 内部会创建并恢复自己的 AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioContextClass) {
        const tempContext = new AudioContextClass();
        if (tempContext.state === 'suspended') {
          await tempContext.resume();
          console.log(`${LOG_PREFIX} useAudioPlayer: AudioContext 已恢复（autoplay 策略已满足）`);
        }
        // 关闭临时 context，释放资源
        // 浏览器已记录用户交互，后续 AudioContext 创建将自动处于 running 状态
        await tempContext.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} useAudioPlayer: 启用音频失败: ${message}`);
    }
  }, [getPlayer]);

  return {
    playbackState,
    play,
    pause,
    resume,
    stop,
    setMasterVolume,
    setLayerVolume,
    setLayerPan,
    enableAudio,
    isSupported,
  };
}
