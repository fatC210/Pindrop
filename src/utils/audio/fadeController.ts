/**
 * 淡入淡出控制器
 *
 * 使用 GainNode.gain.linearRampToValueAtTime 实现平滑音量过渡。
 * 淡入 1.5s，淡出 0.8s。
 *
 * 需求覆盖: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { MixerState } from './types';
import { FADE_IN_DURATION_S, FADE_OUT_DURATION_S, ALL_LAYER_TYPES } from './types';

/**
 * 淡入淡出控制器
 *
 * 提供淡入、淡出和取消淡化的方法，支持单层和全层操作。
 */
export class FadeController {
  private fadeInDuration = FADE_IN_DURATION_S;
  private fadeOutDuration = FADE_OUT_DURATION_S;

  setDurations(options: { fadeInDuration?: number; fadeOutDuration?: number }): void {
    if (
      typeof options.fadeInDuration === 'number' &&
      Number.isFinite(options.fadeInDuration) &&
      options.fadeInDuration > 0
    ) {
      this.fadeInDuration = options.fadeInDuration;
    }

    if (
      typeof options.fadeOutDuration === 'number' &&
      Number.isFinite(options.fadeOutDuration) &&
      options.fadeOutDuration > 0
    ) {
      this.fadeOutDuration = options.fadeOutDuration;
    }
  }

  /**
   * 对指定 GainNode 执行淡入
   *
   * 从 0 线性渐变到目标音量，持续 1.5 秒。
   *
   * @param gainNode - 目标 GainNode
   * @param targetVolume - 目标音量 (0-1)
   * @param currentTime - 当前 AudioContext 时间（秒）
   */
  fadeIn(gainNode: GainNode, targetVolume: number, currentTime: number): void {
    // 步骤 1: 取消所有已调度的音量变化
    gainNode.gain.cancelScheduledValues(currentTime);

    // 步骤 2: 设置当前音量为 0
    gainNode.gain.setValueAtTime(0, currentTime);

    // 步骤 3: 线性渐变到目标音量，持续 1.5 秒
    gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + this.fadeInDuration);
  }

  /**
   * 对指定 GainNode 执行淡出
   *
   * 从当前音量线性渐变到 0，持续 0.8 秒。
   *
   * @param gainNode - 目标 GainNode
   * @param currentTime - 当前 AudioContext 时间（秒）
   */
  fadeOut(gainNode: GainNode, currentTime: number): void {
    // 步骤 1: 取消所有已调度的音量变化
    gainNode.gain.cancelScheduledValues(currentTime);

    // 步骤 2: 锚定当前音量值
    const currentVolume = gainNode.gain.value;
    gainNode.gain.setValueAtTime(currentVolume, currentTime);

    // 步骤 3: 线性渐变到 0，持续 0.8 秒
    gainNode.gain.linearRampToValueAtTime(0, currentTime + this.fadeOutDuration);
  }

  /**
   * 对所有层同时执行淡入
   *
   * @param mixerState - 混音器状态
   * @param currentTime - 当前 AudioContext 时间（秒）
   */
  fadeInAll(mixerState: MixerState, currentTime: number): void {
    for (const layerType of ALL_LAYER_TYPES) {
      const layerState = mixerState.layers[layerType];
      this.fadeIn(layerState.gainNode, layerState.volume, currentTime);
    }
  }

  /**
   * 对所有层同时执行淡出
   *
   * @param mixerState - 混音器状态
   * @param currentTime - 当前 AudioContext 时间（秒）
   */
  fadeOutAll(mixerState: MixerState, currentTime: number): void {
    for (const layerType of ALL_LAYER_TYPES) {
      const layerState = mixerState.layers[layerType];
      this.fadeOut(layerState.gainNode, currentTime);
    }
  }

  /**
   * 取消指定 GainNode 上的所有已调度的音量变化
   *
   * @param gainNode - 目标 GainNode
   * @param currentTime - 当前 AudioContext 时间（秒）
   */
  cancelFade(gainNode: GainNode, currentTime: number): void {
    gainNode.gain.cancelScheduledValues(currentTime);
  }
}
