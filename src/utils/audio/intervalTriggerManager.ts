/**
 * 间隔触发管理器
 *
 * 使用 setTimeout 按配方中的间隔定时触发 signature 和 dialogue 层。
 * 每次触发创建新的 AudioBufferSourceNode。
 *
 * 需求覆盖: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import type { LayerType } from './types';
import { INTERVAL_LAYERS, MAX_CONCURRENT_SOURCE_NODES } from './types';
import type { FiveLayerMixer } from './fiveLayerMixer';
import type { FadeController } from './fadeController';

/** 日志前缀 */
const LOG_PREFIX = '[PinDrop Audio]';

/** 间隔触发的有效范围 */
const SIGNATURE_INTERVAL_MIN_S = 30;
const SIGNATURE_INTERVAL_MAX_S = 90;
const DIALOGUE_INTERVAL_MIN_S = 30;
const DIALOGUE_INTERVAL_MAX_S = 120;

/**
 * 间隔触发管理器
 *
 * 管理 signature 和 dialogue 层的定时触发。
 */
export class IntervalTriggerManager {
  /** 待执行的 timeout 映射 */
  private pendingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * 启动 signature 层的间隔触发
   *
   * 按 intervalSeconds 间隔定时触发 signature 层播放。
   *
   * @param intervalSeconds - 触发间隔（秒），会被 clamp 到 [30, 90]
   * @param buffer - 解码后的 AudioBuffer
   * @param mixer - FiveLayerMixer 实例
   * @param fadeController - FadeController 实例
   * @param context - AudioContext 实例
   */
  startSignatureTrigger(
    intervalSeconds: number,
    buffer: AudioBuffer,
    mixer: FiveLayerMixer,
    fadeController: FadeController,
    context: AudioContext
  ): void {
    // 将间隔 clamp 到 [30, 90]
    const clampedInterval = Math.max(
      SIGNATURE_INTERVAL_MIN_S,
      Math.min(SIGNATURE_INTERVAL_MAX_S, intervalSeconds)
    );

    // 立即播放第一次
    this.playSignatureOnce(buffer, mixer, fadeController, context);

    // 调度下一次触发
    this.scheduleSignatureTrigger(clampedInterval, buffer, mixer, fadeController, context);
  }

  /**
   * 启动 dialogue 层的间隔触发
   *
   * 按 repeatIntervalSeconds 间隔定时触发 dialogue 或 secondaryDialogue 层播放。
   *
   * @param layerType - 层类型（'dialogue' 或 'secondaryDialogue'）
   * @param repeatIntervalSeconds - 触发间隔（秒），会被 clamp 到 [30, 120]
   * @param buffer - 解码后的 AudioBuffer
   * @param mixer - FiveLayerMixer 实例
   * @param fadeController - FadeController 实例
   * @param context - AudioContext 实例
   */
  startDialogueTrigger(
    layerType: 'dialogue' | 'secondaryDialogue',
    repeatIntervalSeconds: number,
    buffer: AudioBuffer,
    mixer: FiveLayerMixer,
    fadeController: FadeController,
    context: AudioContext
  ): void {
    // 将间隔 clamp 到 [30, 120]
    const clampedInterval = Math.max(
      DIALOGUE_INTERVAL_MIN_S,
      Math.min(DIALOGUE_INTERVAL_MAX_S, repeatIntervalSeconds)
    );

    // 立即播放第一次
    this.playDialogueOnce(layerType, buffer, mixer, fadeController, context);

    // 调度下一次触发
    this.scheduleDialogueTrigger(
      layerType,
      clampedInterval,
      buffer,
      mixer,
      fadeController,
      context
    );
  }

  /**
   * 播放 signature 层一次
   *
   * @private
   */
  private playSignatureOnce(
    buffer: AudioBuffer,
    mixer: FiveLayerMixer,
    fadeController: FadeController,
    context: AudioContext
  ): void {
    // 检查并发限制
    if (mixer.getActiveSourceCount() >= MAX_CONCURRENT_SOURCE_NODES) {
      console.warn(
        `${LOG_PREFIX} 跳过 signature 触发：并发 SourceNode 数量已达上限 (${MAX_CONCURRENT_SOURCE_NODES})`
      );
      return;
    }

    mixer.playLayer('signature', buffer, false);
    fadeController.fadeIn(
      mixer.getLayerState('signature').gainNode,
      mixer.getLayerState('signature').volume,
      context.currentTime
    );
  }

  /**
   * 播放 dialogue 层一次
   *
   * @private
   */
  private playDialogueOnce(
    layerType: 'dialogue' | 'secondaryDialogue',
    buffer: AudioBuffer,
    mixer: FiveLayerMixer,
    fadeController: FadeController,
    context: AudioContext
  ): void {
    // 检查并发限制
    if (mixer.getActiveSourceCount() >= MAX_CONCURRENT_SOURCE_NODES) {
      console.warn(
        `${LOG_PREFIX} 跳过 ${layerType} 触发：并发 SourceNode 数量已达上限 (${MAX_CONCURRENT_SOURCE_NODES})`
      );
      return;
    }

    mixer.playLayer(layerType, buffer, false);
    fadeController.fadeIn(
      mixer.getLayerState(layerType).gainNode,
      mixer.getLayerState(layerType).volume,
      context.currentTime
    );
  }

  /**
   * 调度下一次 signature 触发
   *
   * @private
   */
  private scheduleSignatureTrigger(
    intervalSeconds: number,
    buffer: AudioBuffer,
    mixer: FiveLayerMixer,
    fadeController: FadeController,
    context: AudioContext
  ): void {
    const timeoutId = setTimeout(() => {
      this.playSignatureOnce(buffer, mixer, fadeController, context);
      this.scheduleSignatureTrigger(intervalSeconds, buffer, mixer, fadeController, context);
    }, intervalSeconds * 1000);

    this.pendingTimeouts.set('signature', timeoutId);
  }

  /**
   * 调度下一次 dialogue 触发
   *
   * @private
   */
  private scheduleDialogueTrigger(
    layerType: 'dialogue' | 'secondaryDialogue',
    intervalSeconds: number,
    buffer: AudioBuffer,
    mixer: FiveLayerMixer,
    fadeController: FadeController,
    context: AudioContext
  ): void {
    const timeoutId = setTimeout(() => {
      this.playDialogueOnce(layerType, buffer, mixer, fadeController, context);
      this.scheduleDialogueTrigger(
        layerType,
        intervalSeconds,
        buffer,
        mixer,
        fadeController,
        context
      );
    }, intervalSeconds * 1000);

    this.pendingTimeouts.set(layerType, timeoutId);
  }

  /**
   * 清除所有待执行的 timeout
   */
  clearAll(): void {
    for (const timeoutId of this.pendingTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * 清除指定层的 timeout
   *
   * @param layerType - 层类型
   */
  clearLayer(layerType: LayerType): void {
    const timeoutId = this.pendingTimeouts.get(layerType);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingTimeouts.delete(layerType);
    }
  }
}
