/**
 * 总音量控制器
 *
 * 管理 Master GainNode，提供全局音量调节（0-1 范围）。
 * 音量设置通过 preferencesStore 持久化到 localStorage。
 *
 * 需求覆盖: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 16.1, 16.3
 */

import { preferencesStore } from '@/components/settings/preferencesStore';
import { DEFAULT_MASTER_VOLUME } from './types';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/**
 * 将数值限制在 [min, max] 范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 总音量控制器
 *
 * 创建并管理 Master GainNode，连接在所有层 GainNode 和 AudioContext.destination 之间。
 * 提供音量设置、加载、重置功能，音量变更立即生效并持久化。
 */
export class MasterVolumeController {
  /** Master GainNode 实例，未初始化时为 null */
  private masterGainNode: GainNode | null = null;

  /**
   * 初始化 Master GainNode 并连接到 AudioContext.destination
   *
   * 创建 GainNode，设置初始音量为已保存的值（或默认值），
   * 并连接到 destination 作为音频输出的最终节点。
   *
   * @param context - AudioContext 实例
   * @returns 创建的 Master GainNode
   */
  initialize(context: AudioContext): GainNode {
    this.masterGainNode = context.createGain();

    // 从持久化存储加载已保存的音量
    const savedVolume = this.loadSavedVolume();
    this.masterGainNode.gain.value = savedVolume;

    // 连接到 AudioContext.destination（音频输出）
    this.masterGainNode.connect(context.destination);

    console.log(
      `${LOG_PREFIX} MasterVolumeController 已初始化，音量: ${savedVolume}`
    );

    return this.masterGainNode;
  }

  /**
   * 设置总音量
   *
   * 将音量值 clamp 到 [0, 1] 范围，立即更新 GainNode.gain.value，
   * 并通过 preferencesStore 持久化到 localStorage。
   *
   * @param volume - 目标音量值（会被 clamp 到 [0, 1]）
   */
  setVolume(volume: number): void {
    const clampedVolume = clamp(volume, 0, 1);

    // 立即更新 GainNode（如果已初始化）
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = clampedVolume;
    }

    // 持久化到 localStorage
    this.persistVolume(clampedVolume);
  }

  /**
   * 获取当前总音量
   *
   * 如果 GainNode 已初始化，返回其当前 gain 值；
   * 否则从持久化存储加载。
   *
   * @returns 当前总音量值（0-1）
   */
  getVolume(): number {
    if (this.masterGainNode) {
      return this.masterGainNode.gain.value;
    }
    return this.loadSavedVolume();
  }

  /**
   * 从 preferencesStore 加载已保存的总音量
   *
   * 读取 pindrop_preferences 中的 masterVolume 字段。
   * 如果值无效（非数字或超出范围），返回默认值 DEFAULT_MASTER_VOLUME (0.7)。
   *
   * @returns 已保存的音量值，无效时返回默认值 0.7
   */
  loadSavedVolume(): number {
    try {
      const preferences = preferencesStore.loadPreferences();
      const savedVolume = preferences.masterVolume;

      // 验证值的有效性
      if (
        typeof savedVolume === 'number' &&
        !Number.isNaN(savedVolume) &&
        savedVolume >= 0 &&
        savedVolume <= 1
      ) {
        return savedVolume;
      }

      return DEFAULT_MASTER_VOLUME;
    } catch (error) {
      console.error(
        `${LOG_PREFIX} 加载已保存音量失败:`,
        error
      );
      return DEFAULT_MASTER_VOLUME;
    }
  }

  /**
   * 重置为默认总音量
   *
   * 将音量重置为 DEFAULT_MASTER_VOLUME (0.7)，
   * 同时更新 GainNode 和持久化存储。
   */
  resetToDefault(): void {
    this.setVolume(DEFAULT_MASTER_VOLUME);
    console.log(
      `${LOG_PREFIX} 总音量已重置为默认值: ${DEFAULT_MASTER_VOLUME}`
    );
  }

  /**
   * 将音量值持久化到 localStorage
   *
   * 通过 preferencesStore 读取当前偏好，更新 masterVolume 字段后保存。
   *
   * @param volume - 要持久化的音量值
   */
  private persistVolume(volume: number): void {
    try {
      const preferences = preferencesStore.loadPreferences();
      preferences.masterVolume = volume;
      preferencesStore.savePreferences(preferences);
    } catch (error) {
      console.error(
        `${LOG_PREFIX} 持久化音量失败:`,
        error
      );
    }
  }
}
